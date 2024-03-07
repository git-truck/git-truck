import { Database } from "duckdb-async"
import type { CommitDTO, FileChange, GitLogEntry, RenameEntry } from "./model"
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
    await db.all(`
      CREATE TABLE IF NOT EXISTS commits (
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
      CREATE TABLE IF NOT EXISTS temporary_renames (
        fromname VARCHAR,
        toname VARCHAR,
        timestamp UINTEGER,
        timestampend UINTEGER
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
      SELECT f.commithash, f.contribcount, f.filepath, author, c.time, c.message, c.body FROM
      filechanges f JOIN commits_unioned c on f.commithash = c.hash
      WHERE c.time BETWEEN ${timeSeriesStart ?? 0} AND ${timeSeriesEnd ?? 1_000_000_000_000};

      CREATE OR REPLACE VIEW processed_renames AS
      SELECT 
          tr1.fromname AS fromname, 
          tr1.toname AS toname, 
          MIN(tr1.timestamp) AS timestamp, 
          MAX(tr2.timestampend) AS timestampend
      FROM 
          temporary_renames tr1
      JOIN 
          temporary_renames tr2 ON tr1.fromname = tr2.fromname AND tr1.toname = tr2.toname
      WHERE 
          tr1.timestamp <= tr2.timestampend 
          AND tr2.timestamp >= tr1.timestamp
      GROUP BY 
          tr1.fromname, tr1.toname;

      CREATE OR REPLACE VIEW filechanges_commits_renamed AS
      SELECT f.commithash, f.contribcount, f.author, f.time, f.message, f.body,
          CASE
              WHEN r.toname IS NOT NULL THEN r.toname
              ELSE f.filepath
          END AS filepath
      FROM filechanges_commits f
      LEFT JOIN processed_renames r ON f.filepath = r.fromname
                    AND f.time >= r.timestamp 
                    AND f.time <= r.timestampend;

      CREATE OR REPLACE VIEW relevant_renames AS
      SELECT * FROM renames
      WHERE timestamp BETWEEN ${timeSeriesStart ?? 0} AND ${timeSeriesEnd ?? 1_000_000_000_000};
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

  private async addFileChanges(fileChanges: FileChange[], hash: string) {
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

  public async replaceTemporaryRenames(renames: RenameEntry[]) {
    await (await this.instance).all(`
      DELETE FROM temporary_renames;
    `)

    for (let index = 0; index < renames.length; index += 5000) {
      const queryBuilderRenames: string[] = ["INSERT INTO temporary_renames (fromname, toname, timestamp, timestampend) VALUES "]
      const valueArrayRenames: (string|number|null)[] = []
      const count = Math.min(5000, renames.length - index)
      for (let i = 0; i < count; i++) {
        queryBuilderRenames.push("(?, ?, ?, ?),")
        const current = renames[index + i]
        valueArrayRenames.push(current.originalToName, current.toname, current.timestamp, current.timestampEnd ?? null)
      }
      const insertStatement = await (await this.instance).prepare(queryBuilderRenames.join(""))
      await insertStatement.run(...valueArrayRenames)
    }
  }
  
  public async getAuthorUnions() {
    const res = await (await this.instance).all(`
      SELECT actualname, LIST(alias) as aliases FROM authorunions GROUP BY actualname;
    `)
    return res.map((row) => [row["actualname"] as string, ...(row["aliases"] as string[])])
  }
  
  public async getCurrentRenames() {
    const res = await (await this.instance).all(`
      SELECT * FROM relevant_renames;
    `)
    return res.map((row) => {
      return {
        fromname: row["fromname"] as string,
        toname: row["toname"] as string,
        timestamp: Number(row["timestamp"]),
        originalToName: row["toname"] as string,
      } as RenameEntry
    })
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
      SELECT distinct commithash, author, time, message, body 
      FROM filechanges_commits_renamed
      WHERE filepath LIKE '${path}%'
      ORDER BY time DESC
      LIMIT ${count};
    `)
    return res.map((row) => {
      return {author: row["author"], time: row["time"], body: row["body"], hash: row["commithash"], message: row["message"]} as CommitDTO
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await (await this.instance).all(`
      SELECT COUNT(DISTINCT commithash) AS count from filechanges_commits_renamed WHERE filepath LIKE '${path}%';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    // TODO: aggregate for renamed files
    const res = await (await this.instance).all(`
      SELECT filepath, count(*) AS count FROM filechanges_commits_renamed GROUP BY filepath ORDER BY count DESC;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["count"])]
    }))
  }
  
  public async getLastChangedPerFile() {
    const res = await (await this.instance).all(`
      SELECT filepath, MAX(time) AS max_time FROM filechanges_commits_renamed GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["max_time"])]
    }))
  }
  
  public async getAuthorCountPerFile() {
    // TODO: aggregate for renamed files, also handle coauthors
    const res = await (await this.instance).all(`
      SELECT filepath, count(DISTINCT author) AS author_count FROM filechanges_commits_renamed GROUP BY filepath;
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
        FROM filechanges_commits_renamed
      )
      SELECT filepath, author, contribcount
      FROM RankedAuthors
      WHERE rank = 1;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, row["author"] as string]
    }))
  }

  public async addRenames(renames: RenameEntry[]) {
    const queryBuilderRenames: string[] = ["INSERT INTO renames (fromname, toname, timestamp) VALUES "]
    const valueArrayRenames: (string|number)[] = []
    for (let i = 0; i < renames.length; i++) queryBuilderRenames.push("(?, ?, ?),")
    for (const rename of renames) {
      if (rename.fromname.includes("BubbleChart.tsx")) {
        console.log("rename", rename)
      }
      valueArrayRenames.push(rename.fromname, rename.toname, rename.timestamp)
    }
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
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filepath, MAX(time) AS max_time FROM filechanges_commits_renamed GROUP BY filepath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }
  
  public async getMaxAndMinCommitCount() {
    const res = await (await this.instance).all(`
      SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filepath, count(*) AS count FROM filechanges_commits_renamed GROUP BY filepath ORDER BY count DESC);
    `)
    return {maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"])}
  }
  
  public async getAuthorContribsForFile(path: string, isblob: boolean) {
    const res = await (await this.instance).all(`
      SELECT author, SUM(contribcount) AS contribsum FROM filechanges_commits_renamed WHERE filepath ${isblob ? "=" : "LIKE"} '${path}${isblob ? "" : "%"}' GROUP BY author ORDER BY contribsum DESC;
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
        await this.addFileChanges(commit.fileChanges, commit.hash)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
      }
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()
    }
    console.log("final flush")
    await this.flushFileChanges()
  }
}
