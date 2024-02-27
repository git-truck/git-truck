import { Database } from "duckdb-async"
import type { CommitDTO, FileChange, GitLogEntry } from "./model"
import os from "os"
import { resolve, dirname } from "path"
import { promises as fs, existsSync } from "fs"
import { log } from "./log.server"

export default class DB {
  private instance: Promise<Database>
  private repoSanitized: string
  private branchSanitized: string

  private static async init(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, {recursive: true})
    const db = await Database.create(dbPath)
    await this.initTables(db)
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
    CREATE TABLE IF NOT EXISTS metadata (
      field VARCHAR,
      value UBIGINT
    );
    `)
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

  public async getCommits(skip: number, count: number) {
    const res = await (await this.instance).all(`
      SELECT * FROM commits ORDER BY time DESC OFFSET ${skip} LIMIT ${count};
    `)
    return res.map((row) => {
      return {author: row["author"], time: row["time"], body: row["body"], hash: row["hash"], message: row["message"]} as CommitDTO
    })
  }

  public async getCommitCountPerFile() {
    // TODO: aggregate for renamed files
    const res = await (await this.instance).all(`
      SELECT filepath, count(*) AS count FROM filechanges GROUP BY filepath ORDER BY count DESC;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["count"])]
    }))
  }
  
  public async getLastChangedPerFile() {
    const res = await (await this.instance).all(`
      SELECT f.filepath, MAX(c.time) AS max_time FROM filechanges f JOIN commits c ON f.commithash = c.hash GROUP BY f.filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["max_time"])]
    }))
  }
  
  public async getAuthorCountPerFile() {
    // TODO: aggregate for renamed files, also handle coauthors
    const res = await (await this.instance).all(`
      SELECT f.filepath, count(DISTINCT c.author) AS author_count FROM filechanges f JOIN commits c ON f.commithash = c.hash GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["author_count"])]
    }))
  }
  
  public async getDominantAuthorPerFile() {
    // TODO: also handle renames
    const res = await (await this.instance).all(`
      WITH RankedAuthors AS (
        SELECT f.filepath, c.author, f.contribcount, ROW_NUMBER() OVER (PARTITION BY f.filepath ORDER BY f.contribcount DESC, c.author ASC) as rank
        FROM filechanges f JOIN commits c ON f.commithash = c.hash
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

  public async getLatestCommitHash() {
    const res = await (await this.instance).all(`
      SELECT hash FROM commits ORDER BY time DESC LIMIT 1;
    `)
    log.debug(`length ${res.length}`)
    log.debug("im trying okay")
    return res[0]["hash"] as string
  }

  public async hasCompletedPreviously() {
    const res = await (await this.instance).all(`
      SELECT count(*) as count FROM metadata WHERE field = 'finished';
    `)
    return res[0]["count"] > 0
  }
  
  public async getNewestAndOldestChangeDates() {
    // TODO: filter out files no longer in file tree
    const res = await (await this.instance).all(`
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT f.filepath, MAX(c.time) AS max_time FROM filechanges f JOIN commits c ON f.commithash = c.hash GROUP BY filepath);
    `)
    console.log("newestoldest", res, res[0]["newest"], res[0]["oldest"])
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }
  
  public async getMaxCommitCount() {
    const res = await (await this.instance).all(`
      SELECT MAX(count) as max_commits FROM (SELECT filepath, count(*) AS count FROM filechanges GROUP BY filepath ORDER BY count DESC);
    `)
    console.log("maxcommit")
    return res[0]["max_commits"] as number
  }

  public async setFinishTime() {
    // TODO: also have metadata for table format, to rerun if data model changed
    await (await this.instance).all(`
      INSERT INTO metadata (field, value) VALUES ('finished', ${Date.now()});
    `)
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

  // public static async addFile(blob: GitBlobObject) {
  //   await this.instance?.all(`INSERT INTO files (hash, path, sizeInBytes, name) VALUES
  //       ('${blob.hash}', '${blob.path}', ${blob.sizeInBytes}, '${blob.name}');
  //   `)
  // }
}
