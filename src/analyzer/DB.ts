import { Database } from "duckdb-async"
import type { GitBlobObject, GitLogEntry } from "./model"

export default class DB {
  private static instance: Database | null = null

  public static async init() {
    if (!this.instance) this.instance = await Database.create(":memory:")
  }

  public static async query(query: string) {
    return await this.instance?.all(query)
  }

  public static async addCommits(commits: Map<string, GitLogEntry>) {
    const commitEntries = commits.values()
    if (commits.size < 1) return
    await this.instance?.all(`CREATE TABLE IF NOT EXISTS commits (
      hash VARCHAR,
      author VARCHAR,
      time UINTEGER
      );`)

    const batchSize = 10_000
    for (let index = 0; index < commits.size; index += batchSize) {
      const thisBatchSize = Math.min(commits.size - index, batchSize)


      const queryBuilder: string[] = []
      queryBuilder.push("INSERT INTO commits (hash, author, time) VALUES ")
      for (let i = 0; i < thisBatchSize; i++) queryBuilder.push("(?, ?, ?),")
      const insertStatement = await this.instance!.prepare(queryBuilder.join(""))
  
      const valueArray = []
      for (let x = 0; x < thisBatchSize; x++) {
        const commit = commitEntries.next().value
        valueArray.push(commit.hash, commit.author, commit.time)
      }
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
