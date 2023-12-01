import { Database } from "duckdb-async"
import type { GitLogEntry } from "./model"

export default class DB {
  private static instance: Database | null = null

  public static async init() {
    if (!this.instance) this.instance = await Database.create(":memory:")
    await this.instance.all(`CREATE TABLE IF NOT EXISTS commits (
        hash VARCHAR,
        author VARCHAR,
        time INTEGER
    );`)
  }

  public static async query(query: string) {
    return await this.instance?.all(query)
  }

  public static async addCommits(commits: Map<string, GitLogEntry>) {
    if (commits.size < 1) return
    const queryBuilder: string[] = []
    queryBuilder.push("INSERT INTO commits (hash, author, time) VALUES")
    for (const [, commit] of commits) {
      queryBuilder.push(`('${commit.hash}', '${commit.author}', ${commit.time}),`)
    }

    this.instance?.all(queryBuilder.join(" "))
  }
}
