import { Database } from "duckdb-async"
import type { CommitDTO, FileChange, GitLogEntry } from "./model"
import os from "os"
import { resolve, dirname } from "path"
import { promises as fs, existsSync } from "fs"

export default class DB {
  private instance: Promise<Database>
  private repoSanitized: string
  private branchSanitized: string

  private static async init(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, {recursive: true})
    const db = await Database.create(dbPath)
    await this.initTables(db)
    await this.initViews(db)
    return db
  }

  constructor(private repo: string, private branch: string) {
    this.repoSanitized = repo.replace(/\W/g, "_")
    this.branchSanitized = branch.replace(/\W/g, "_")
    const dbPath = resolve(os.tmpdir(), "git-truck-cache", this.repoSanitized, this.branchSanitized + ".db")
    this.instance = DB.init(dbPath)
  }

  public async query(query: string) {
    return await (await this.instance).all(query)
  }

  private static async initTables(db: Database) {
    await db.all(`CREATE TABLE IF NOT EXISTS commits (
      hash VARCHAR PRIMARY KEY,
      author VARCHAR,
      time UINTEGER,
      body VARCHAR,
      message VARCHAR
    );
    CREATE TABLE IF NOT EXISTS filechanges (
      commithash VARCHAR,
      contribcount UINTEGER,
      filepath VARCHAR,
      --FOREIGN KEY (commithash) REFERENCES commits(hash)
    );
    CREATE TABLE IF NOT EXISTS authorunions (
      alias VARCHAR PRIMARY KEY,
      actualname VARCHAR
    );
    CREATE TABLE IF NOT EXISTS renames (
      fromname VARCHAR,
      toname VARCHAR,
      timestamp UINTEGER
    );
    CREATE TABLE IF NOT EXISTS hiddenfiles (
      path VARCHAR
    );
    CREATE TABLE IF NOT EXISTS metadata (
      field VARCHAR,
      value UBIGINT,
      value2 VARCHAR
    );
    `)
  }

  private static async initViews(db: Database, timeSeriesStart?: number, timeSeriesEnd?: number) {
    await db.all(`
      CREATE OR REPLACE VIEW commits_unioned AS
      SELECT c.hash, CASE WHEN u.actualname IS NOT NULL THEN u.actualname ELSE c.author END AS author, c.time, c.body, c.message FROM
      commits c LEFT JOIN authorunions u ON c.author = u.alias
      WHERE c.time BETWEEN ${timeSeriesStart ?? 0} AND ${timeSeriesEnd ?? 1_000_000_000_000};

      CREATE OR REPLACE VIEW filechanges_commits AS
      SELECT f.commithash, f.contribcount, f.filepath, author, c.time FROM
      filechanges f JOIN commits_unioned c on f.commithash = c.hash
      WHERE c.time BETWEEN ${timeSeriesStart ?? 0} AND ${timeSeriesEnd ?? 1_000_000_000_000};;
    `)
  }

  public async updateTimeInterval(start: number, end: number) {
    await DB.initViews(await this.instance, start, end)
  }

  private batchSize = 5000
  private queryBuilderFilechanges: string[] = [`INSERT INTO filechanges (commithash, contribcount, filepath) VALUES `]
  private valueArrayFilechanges: (string|boolean|number)[] = []

  private async flushFileChanges() {
    if (this.valueArrayFilechanges.length === 0) return
    const insertStatement = await (await this.instance).prepare(this.queryBuilderFilechanges.join(""))
    await insertStatement.run(...this.valueArrayFilechanges)
    await insertStatement.finalize()
    this.queryBuilderFilechanges = [`INSERT INTO filechanges (commithash, contribcount, filepath) VALUES `]
    this.valueArrayFilechanges = []
  }

  private async addFileChanges(fileChanges: FileChange[], author: string, hash: string) {
    // console.log("filechanges count", fileChanges.length)
    for (const fileChange of fileChanges) {
      this.queryBuilderFilechanges.push(`(?, ?, ?),`)
      this.valueArrayFilechanges.push(hash, fileChange.contribs, fileChange.path)
      if (this.queryBuilderFilechanges.length >= this.batchSize) {
        await this.flushFileChanges()
      }
    }
  }

  public async replaceAuthorUnions(unions: string[][]) {
    const queryBuilder: string[] = ["DELETE FROM authorunions;"]
    if (unions.length > 0) queryBuilder.push("INSERT INTO authorunions (alias, actualname) VALUES")
    for (const union of unions) {
      const [actualname, ...aliases] = union
      for (const alias of aliases) {
        queryBuilder.push(`('${alias}', '${actualname}'),`)
      }
    }
    queryBuilder.push(";")

    await (await this.instance).all(queryBuilder.join(" "))
  }
  
  public async getAuthorUnions() {
    const res = await (await this.instance).all(`
      SELECT actualname, LIST(alias) as aliases FROM authorunions GROUP BY actualname;
    `)
    return res.map((row) => [row["actualname"] as string, ...(row["aliases"] as string[])])
  }

  public async getHiddenFiles() {
    const res = await (await this.instance).all(`
      SELECT path FROM hiddenfiles ORDER BY path ASC;
    `)
    return res.map(row => row["path"] as string)
    }

  public async replaceHiddenFiles(hiddenFiles: string[]) {
    const queryBuilder: string[] = ["DELETE FROM hiddenfiles;"]
    if (hiddenFiles.length > 0) queryBuilder.push("INSERT INTO hiddenfiles (path) VALUES")
    for (const file of hiddenFiles) {
      queryBuilder.push(`('${file}'),`)
    }
    queryBuilder.push(";")

    await (await this.instance).all(queryBuilder.join(" "))
  }

  public async getCommits(path: string, count: number) {
    const res = await (await this.instance).all(`
    SELECT hash, author, time, message, body FROM commits_unioned c INNER JOIN (
      SELECT distinct commithash FROM filechanges WHERE filepath LIKE '${path}%'
    ) f ON c.hash = f.commithash
    ORDER BY time DESC LIMIT ${count};
    `)
    return res.map((row) => {
      return {author: row["author"], time: row["time"], body: row["body"], hash: row["hash"], message: row["message"]} as CommitDTO
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await (await this.instance).all(`
      SELECT COUNT(DISTINCT commithash) AS count from filechanges_commits WHERE filepath LIKE '${path}%';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    // TODO: aggregate for renamed files
    const res = await (await this.instance).all(`
      SELECT filepath, count(*) AS count FROM filechanges_commits GROUP BY filepath ORDER BY count DESC;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["count"])]
    }))
  }
  
  public async getLastChangedPerFile() {
    const res = await (await this.instance).all(`
      SELECT filepath, MAX(time) AS max_time FROM filechanges_commits GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["max_time"])]
    }))
  }
  
  public async getAuthorCountPerFile() {
    // TODO: aggregate for renamed files, also handle coauthors
    const res = await (await this.instance).all(`
      SELECT filepath, count(DISTINCT author) AS author_count FROM filechanges_commits GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["author_count"])]
    }))
  }
  
  public async getDominantAuthorPerFile() {
    // TODO: also handle renames
    const res = await (await this.instance).all(`
      WITH RankedAuthors AS (
        SELECT filepath, author, contribcount, ROW_NUMBER() OVER (PARTITION BY filepath ORDER BY contribcount DESC, author ASC) as rank
        FROM filechanges_commits
      )
      SELECT filepath, author, contribcount
      FROM RankedAuthors
      WHERE rank = 1;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, row["author"] as string]
    }))
  }

  public async addRenames(renames: {from: string, to: string, time: number}[]) {
    const queryBuilderRenames: string[] = ["INSERT INTO renames (fromname, toname, timestamp) VALUES "]
    const valueArrayRenames: (string|number)[] = []
    for (let i = 0; i < renames.length; i++) queryBuilderRenames.push("(?, ?, ?),")
    for (const rename of renames) valueArrayRenames.push(rename.from, rename.to, rename.time)
    if (valueArrayRenames.length === 0) return
    const insertStatement = await (await this.instance).prepare(queryBuilderRenames.join(""))
    await insertStatement.run(...valueArrayRenames)
    await insertStatement.finalize()
  }

  public async getLatestCommitHash(beforeTime?: number) {
    const res = await (await this.instance).all(`
      SELECT hash FROM commits WHERE time <= ${beforeTime ?? 1_000_000_000_000} ORDER BY time DESC LIMIT 1;
    `)
    return res[0]["hash"] as string
  }

  public async hasCompletedPreviously() {
    const res = await (await this.instance).all(`
      SELECT count(*) as count FROM metadata WHERE field = 'finished';
    `)
    return res[0]["count"] > 0
  }

  public async getAuthors() {
    const res = await (await this.instance).all(`
      SELECT DISTINCT author FROM commits_unioned;
    `)
    return res.map(row => row["author"] as string)
  }
  
  public async getNewestAndOldestChangeDates() {
    // TODO: filter out files no longer in file tree
    const res = await (await this.instance).all(`
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filepath, MAX(time) AS max_time FROM filechanges_commits GROUP BY filepath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }
  
  public async getMaxAndMinCommitCount() {
    const res = await (await this.instance).all(`
      SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filepath, count(*) AS count FROM filechanges_commits GROUP BY filepath ORDER BY count DESC);
    `)
    return {maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"])}
  }
  
  public async getAuthorContribsForFile(path: string, isblob: boolean) {
    const res = await (await this.instance).all(`
      SELECT author, SUM(contribcount) AS contribsum FROM filechanges_commits WHERE filepath ${isblob ? "=" : "LIKE"} '${path}${isblob ? "" : "%"}' GROUP BY author ORDER BY contribsum DESC;
    `)
    return res.map(row => {
      return {author: row["author"] as string, contribs: Number(row["contribsum"])}
    })
  }

  public async setFinishTime() {
    // TODO: also have metadata for table format, to rerun if data model changed
    const latestHash = (await (await this.instance).all(`SELECT hash FROM commits ORDER BY time DESC LIMIT 1;`))[0]["hash"] as string
    await (await this.instance).all(`
      INSERT INTO metadata (field, value, value2) VALUES ('finished', ${Date.now()}, '${latestHash}');
    `)
  }
  
  public async getLastRunInfo() {
    const res = await (await this.instance).all(`
      SELECT value as time, value2 as hash FROM metadata WHERE field = 'finished' ORDER BY value DESC LIMIT 1;
    `)
    if (!res[0]) return {time: 0, hash: ""}
    return {time: Number(res[0]["time"]), hash: res[0]["hash"] as string}
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    const commitEntries = commits.values()
    if (commits.size < 1) return
    
    for (let index = 0; index < commits.size; index += this.batchSize) {
      const thisBatchSize = Math.min(commits.size - index, this.batchSize)
      
      const queryBuilderCommits: string[] = []
      queryBuilderCommits.push(`INSERT INTO commits (hash, author, time, body, message) VALUES `)
      for (let i = 0; i < thisBatchSize; i++) queryBuilderCommits.push(`(?, ?, ?, ?, ?,),`)
      const insertStatement = await (await this.instance).prepare(queryBuilderCommits.join(""))
      const valueArray = []
      for (let x = 0; x < thisBatchSize; x++) {
        const commit = commitEntries.next().value as GitLogEntry
        await this.addFileChanges(commit.fileChanges, commit.author, commit.hash)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
      }
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()
    }
    console.log("final flush")
    await this.flushFileChanges()
  }
}
