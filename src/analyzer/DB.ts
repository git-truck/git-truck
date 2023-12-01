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
    if (commits.size < 1) return
    await this.instance?.all(`CREATE TABLE IF NOT EXISTS commits (
        hash VARCHAR,
        author VARCHAR,
        time INTEGER
    );`)
    const queryBuilder: string[] = []
    queryBuilder.push("INSERT INTO commits (hash, author, time) VALUES")
    for (const [, commit] of commits) {
      queryBuilder.push(`('${commit.hash}', '${commit.author}', ${commit.time}),`)
    }

    await this.instance?.all(queryBuilder.join(" "))
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
