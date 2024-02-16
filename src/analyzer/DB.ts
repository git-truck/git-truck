import { Database } from "duckdb-async"
import type { FileChange, GitBlobObject, GitLogEntry } from "./model"
import { GitCaller } from "./git-caller.server"
import os from "os"
import { resolve } from "path"
import { tableName } from "./util.server"

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

  private async flushFileChanges(queryBuilderFilechanges: string[], valueArrayFilechanges: (string|boolean|number)[]) {
    if (valueArrayFilechanges.length === 0) return
    // console.log("start flush")
    // console.log("querybilder", queryBuilderFilechanges.length, queryBuilderFilechanges.join(""))
    // console.log("values", valueArrayFilechanges.length, valueArrayFilechanges)
    const insertStatement = await (await this.instance).prepare(queryBuilderFilechanges.join(""))
    await insertStatement.run(...valueArrayFilechanges)
    await insertStatement.finalize()
    queryBuilderFilechanges = [`INSERT INTO filechanges (commithash, author, contribcount, filepath, isbinary) VALUES `]
    valueArrayFilechanges = []
    // console.log("end flush")
  }

  private async addFileChanges(fileChanges: FileChange[], author: string, hash: string, queryBuilderFilechanges: string[], valueArrayFilechanges: (string|boolean|number)[], batchSize: number) {
    // console.log("numchanges", fileChanges.length)
    // console.log("before", queryBuilderFilechanges.length)
    for (const fileChange of fileChanges) {
      queryBuilderFilechanges.push(`(?, ?, ?, ?, ?,),`)
      valueArrayFilechanges.push(hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
      // console.log("filechange", hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
    }
    // console.log("after", queryBuilderFilechanges.length)

    if (queryBuilderFilechanges.length > batchSize) {
      await this.flushFileChanges(queryBuilderFilechanges, valueArrayFilechanges)
    }
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    const commitEntries = commits.values()
    if (commits.size < 1) return
    
    const batchSize = 10000
    const queryBuilderFilechanges: string[] = [`INSERT INTO filechanges (commithash, author, contribcount, filepath, isbinary) VALUES `]
    const valueArrayFilechanges: (string|boolean|number)[] = []
    let now = Date.now()
    for (let index = 0; index < commits.size; index += batchSize) {
      const thisBatchSize = Math.min(commits.size - index, batchSize)
      
      const queryBuilderCommits: string[] = []
      queryBuilderCommits.push(`INSERT INTO commits (hash, author, time, body, message) VALUES `)
      for (let i = 0; i < thisBatchSize; i++) queryBuilderCommits.push(`(?, ?, ?, ?, ?,),`)
      const insertStatement = await (await this.instance).prepare(queryBuilderCommits.join(""))
    
      const valueArray = []
      for (let x = 0; x < thisBatchSize; x++) {
        const commit = commitEntries.next().value
        await this.addFileChanges(commit.fileChanges, commit.author, commit.hash, queryBuilderFilechanges, valueArrayFilechanges, batchSize)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
        // console.log("commit", commit)
      }
      // console.log("statemnt", queryBuilderCommits.join(""))
      // console.log("values", valueArray)
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()
      console.log("batch loop", Date.now() - now)
      now = Date.now()
      // console.log("done adding commits")
    }
    await this.flushFileChanges(queryBuilderFilechanges, valueArrayFilechanges)
  }

  // public static async addFile(blob: GitBlobObject) {
  //   await this.instance?.all(`INSERT INTO files (hash, path, sizeInBytes, name) VALUES
  //       ('${blob.hash}', '${blob.path}', ${blob.sizeInBytes}, '${blob.name}');
  //   `)
  // }
}
