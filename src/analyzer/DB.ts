import { Database } from "duckdb-async"
import type { FileChange, GitBlobObject, GitLogEntry } from "./model"
import { GitCaller } from "./git-caller.server"
import os from "os"
import { resolve } from "path"
import { tableName } from "./util.server"

export default class DB {
  private static instance: Database | null = null

  public static async init(repo: string, branch: string) {
    if (!this.instance) {
      // const dbPath = resolve(os.tmpdir(), "git-truck.db")
      const dbPath = ":memory:"
      this.instance = await Database.create(dbPath)
    }
    await DB.initTables(repo, branch)
  }

  public static async query(query: string) {
    return await this.instance?.all(query)
  }

  static async initTables(repo: string, branch: string) {
    await this.instance?.all(`CREATE TABLE IF NOT EXISTS ${tableName("commits", repo, branch)} (
      hash VARCHAR PRIMARY KEY,
      author VARCHAR,
      time UINTEGER,
      body VARCHAR,
      message VARCHAR
    );
    CREATE TABLE IF NOT EXISTS ${tableName("filechanges", repo, branch)} (
      commithash VARCHAR,
      author VARCHAR,
      contribcount UINTEGER,
      filepath VARCHAR,
      isbinary BOOLEAN
    );
    CREATE TABLE IF NOT EXISTS ${tableName("files", repo, branch)} (
      hash VARCHAR,
      path VARCHAR,
      sizeInBytes INTEGER,
      name VARCHAR
    );`)
  }

  public static async addCommits(commits: Map<string, GitLogEntry>, repo: string, branch: string) {
    const commitEntries = commits.values()
    if (commits.size < 1) return
    
    const batchSize = 10
    let queryBuilderFilechanges: string[] = [`INSERT INTO ${tableName("filechanges", repo, branch)} (commithash, author, contribcount, filepath, isbinary) VALUES `]
    let valueArrayFilechanges: (string|boolean|number)[] = []

    async function flushFileChanges() {
      if (valueArrayFilechanges.length === 0) return
      console.log("start flush")
      const insertStatement = await DB.instance!.prepare(queryBuilderFilechanges.join(""))
      await insertStatement.run(...valueArrayFilechanges)
      await insertStatement.finalize()
      queryBuilderFilechanges = [`INSERT INTO ${tableName("filechanges", repo, branch)} (commithash, author, contribcount, filepath, isbinary) VALUES `]
      valueArrayFilechanges = []
      console.log("end flush")
    }

    async function addFileChanges(fileChanges: FileChange[], author: string, hash: string) {

      for (const fileChange of fileChanges) {
        queryBuilderFilechanges.push(`(?, ?, ?, ?, ?,),`)
        valueArrayFilechanges.push(hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
        console.log("filechange", hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
      }

      if (queryBuilderFilechanges.length > batchSize) {
        await flushFileChanges()
      }
    }

    for (let index = 0; index < commits.size; index += batchSize) {
      const thisBatchSize = Math.min(commits.size - index, batchSize)

      const queryBuilderCommits: string[] = []
      queryBuilderCommits.push(`INSERT INTO ${tableName("commits", repo, branch)} (hash, author, time, body, message) VALUES `)
      for (let i = 0; i < thisBatchSize; i++) queryBuilderCommits.push(`(?, ?, ?, ?, ?,),`)
      const insertStatement = await this.instance!.prepare(queryBuilderCommits.join(""))
  
      const valueArray = []
      for (let x = 0; x < thisBatchSize; x++) {
        const commit = commitEntries.next().value
        await addFileChanges(commit.fileChanges, commit.author, commit.hash)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
        console.log("commit", commit)
      }
      console.log("statemnt", queryBuilderCommits.join(""))
      console.log("values", valueArray)
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()
      console.log("done adding commits")
    }
    await flushFileChanges()
  }

  // public static async addFile(blob: GitBlobObject) {
  //   await this.instance?.all(`INSERT INTO files (hash, path, sizeInBytes, name) VALUES
  //       ('${blob.hash}', '${blob.path}', ${blob.sizeInBytes}, '${blob.name}');
  //   `)
  // }
}
