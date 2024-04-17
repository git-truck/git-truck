import { Database } from "duckdb-async"
import { resolve, dirname } from "path"
import os from "os"
import { promises as fs, existsSync } from "fs"
import { CompletedResult } from "./model"

export default class MetadataDB {
  private instance: Promise<Database>

  private static async init(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true })
    const db = await Database.create(dbPath, { temp_directory: dir })
    await db.all(`
            CREATE TABLE IF NOT EXISTS completions (
                repo VARCHAR,
                branch VARCHAR,
                timestamp UINTEGER,
                hash VARCHAR
            );
            CREATE TABLE IF NOT EXISTS authorcolors (
                author VARCHAR,
                color VARCHAR
            );
        `)
    return db
  }

  constructor() {
    const path = resolve(os.tmpdir(), "git-truck-cache", "metadata.db")
    this.instance = MetadataDB.init(path)
  }

  public async setCompletion(repo: string, branch: string, hash: string) {
    await (
      await this.instance
    ).all(`
            INSERT INTO completions (repo, branch, timestamp, hash) VALUES
            ('${repo}', '${branch}', ${Math.floor(Date.now() / 1000)}, '${hash}');
        `)
  }

  public async addAuthorColor(author: string, color: string) {
    await (
      await this.instance
    ).all(`
          DELETE FROM authorcolors WHERE author = '${author}';
        `)
    if (color === "") return
    await (
      await this.instance
    ).all(`
          INSERT INTO authorcolors (author, color) VALUES ('${author}', '${color}');
        `)
  }

  public async getAuthorColors() {
    const res = await (
      await this.instance
    ).all(`
            SELECT * FROM authorcolors;
          `)
    return new Map(
      res.map((row) => {
        return [row["author"] as string, row["color"] as `#${string}`]
      })
    )
  }

  public async getLastRun(repo: string, branch: string) {
    const res = await (
      await this.instance
    ).all(`
          SELECT * FROM completions WHERE repo = '${repo}' AND branch = '${branch}' ORDER BY timestamp DESC LIMIT 1;
        `)
    if (res.length < 1) return undefined
    return { time: Number(res[0]["timestamp"]), hash: res[0]["hash"] as string }
  }

  public async getCompletedRepos() {
    const res = await (
      await this.instance
    ).all(`
            SELECT repo, branch, MAX(timestamp) AS time FROM completions GROUP BY repo, branch;
        `)
    if (res.length < 1) return []
    return res.map((row) => {
      return { repo: row["repo"] as string, branch: row["branch"] as string, time: Number(row["time"]) }
    }) as CompletedResult[]
  }
}
