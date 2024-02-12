import { Database } from "duckdb-async"
import type { FileChange, GitBlobObject, GitLogEntry } from "./model"
import { GitCaller } from "./git-caller.server"

export default class DB {
  private static instance: Database | null = null

  public static async init(repo: string, branch: string) {
    // const filePath = GitCaller.getCachePath(repo, branch).replace(".json", ".db")
    // console.log("filepath", filePath)
    if (!this.instance) this.instance = await Database.create(":memory:")
  }

  public static async query(query: string) {
    return await this.instance?.all(query)
  }

  public static async addCommits(commits: Map<string, GitLogEntry>) {
    const commitEntries = commits.values()
    if (commits.size < 1) return
    await this.instance?.all(`CREATE TABLE IF NOT EXISTS commits (
      hash VARCHAR PRIMARY KEY,
      author VARCHAR,
      time UINTEGER,
      body VARCHAR,
      message VARCHAR
    );`)

    await this.instance?.all(`CREATE TABLE IF NOT EXISTS filechanges (
      commithash VARCHAR,
      author VARCHAR,
      contribcount UINTEGER,
      filepath VARCHAR,
      isbinary BOOLEAN
    );`)

    
    const batchSize = 10_000
    let queryBuilderFilechanges: string[] = ["INSERT INTO filechanges (commithash, author, contribcount, filepath, isbinary) VALUES "]
    let valueArrayFilechanges: (string|boolean|number)[] = []

    async function flushFileChanges() {
      const insertStatement = await DB.instance!.prepare(queryBuilderFilechanges.join(""))
      await insertStatement.run(...valueArrayFilechanges)
      await insertStatement.finalize()
      queryBuilderFilechanges = ["INSERT INTO file-changes (commit-hash, author, contrib-count, file-path, is-binary) VALUES "]
      valueArrayFilechanges = []
    }

    async function addFileChanges(fileChanges: FileChange[], author: string, hash: string) {

      for (const fileChange of fileChanges) {
        queryBuilderFilechanges.push(`(?, ?, ?, ?, ?,),`)
        valueArrayFilechanges.push(hash, author, fileChange.contribs, fileChange.path, fileChange.isBinary)
      }

      if (queryBuilderFilechanges.length > batchSize) {
        await flushFileChanges()
      }
    }

    for (let index = 0; index < commits.size; index += batchSize) {
      const thisBatchSize = Math.min(commits.size - index, batchSize)


      const queryBuilderCommits: string[] = []
      queryBuilderCommits.push("INSERT INTO commits (hash, author, time, body, message) VALUES ")
      for (let i = 0; i < thisBatchSize; i++) queryBuilderCommits.push(`(?, ?, ?, ?, ?,),`)
      const insertStatement = await this.instance!.prepare(queryBuilderCommits.join(""))
  
      const valueArray = []
      for (let x = 0; x < thisBatchSize; x++) {
        const commit = commitEntries.next().value
        await addFileChanges(commit.fileChanges, commit.author, commit.hash)
        valueArray.push(commit.hash, commit.author, commit.time, commit.body, commit.message)
      }
      await flushFileChanges()
      await insertStatement.run(...valueArray)
      await insertStatement.finalize()



    }
  }

  public static async addFile(blob: GitBlobObject) {
    await this.instance?.all(`CREATE TABLE IF NOT EXISTS files (
        hash VARCHAR,
        path VARCHAR,
        sizeInBytes INTEGER,
        name VARCHAR
    );`)

    await this.instance?.all(`INSERT INTO files (hash, path, sizeInBytes, name) VALUES
        ('${blob.hash}', '${blob.path}', ${blob.sizeInBytes}, '${blob.name}');
    `)
  }
}
