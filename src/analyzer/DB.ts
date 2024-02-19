import { Database } from "duckdb-async"
import type { FileChange, GitLogEntry } from "./model"

export default class DB {
  private instance: Promise<Database>

  private static async init(dbPath: string) {
    const db = await Database.create(dbPath)
    await this.initTables(db)
    return db
  }

  constructor(private repo: string, private branch: string) {
    // const dbPath = resolve(os.tmpdir(), "git-truck-cache", repoSanitized, branchSanitized + ".db")
    const dbPath = ":memory:"
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
      author VARCHAR,
      contribcount UINTEGER,
      filepath VARCHAR,
      isbinary BOOLEAN
    );
    CREATE TABLE IF NOT EXISTS files(
      hash VARCHAR,
      path VARCHAR,
      sizeInBytes INTEGER,
      name VARCHAR
    );`)
  }

  private batchSize = 10000
  private queryBuilderFilechanges: string[] = [`INSERT INTO filechanges (commithash, author, contribcount, filepath, isbinary) VALUES `]
  private valueArrayFilechanges: (string|boolean|number)[] = []

  private async flushFileChanges() {
    if (this.valueArrayFilechanges.length === 0) return
    const insertStatement = await (await this.instance).prepare(this.queryBuilderFilechanges.join(""))
    await insertStatement.run(...this.valueArrayFilechanges)
    await insertStatement.finalize()
    this.queryBuilderFilechanges = [`INSERT INTO filechanges (commithash, author, contribcount, filepath, isbinary) VALUES `]
    this.valueArrayFilechanges = []
  }

  private async addFileChanges(fileChanges: FileChange[], author: string, hash: string) {
    for (const fileChange of fileChanges) {
      this.queryBuilderFilechanges.push(`(?, ?, ?, ?, ?,),`)
      this.valueArrayFilechanges.push(hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
    }

    if (this.queryBuilderFilechanges.length > this.batchSize) {
      await this.flushFileChanges()
    }
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
        const commit = commitEntries.next().value
        await this.addFileChanges(commit.fileChanges, commit.author, commit.hash)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
      }
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()
    }
    await this.flushFileChanges()
  }

  // public static async addFile(blob: GitBlobObject) {
  //   await this.instance?.all(`INSERT INTO files (hash, path, sizeInBytes, name) VALUES
  //       ('${blob.hash}', '${blob.path}', ${blob.sizeInBytes}, '${blob.name}');
  //   `)
  // }
}
