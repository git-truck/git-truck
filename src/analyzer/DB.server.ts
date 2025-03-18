import type { DuckDBConnection, DuckDBAppender, DuckDBArrayValue } from "@duckdb/node-api"
import { DuckDBInstance } from "@duckdb/node-api"
import type { CommitDTO, GitLogEntry, RawGitObject, RenameEntry, RenameInterval } from "./model"
import os from "os"
import { resolve, dirname } from "path"
import { promises as fs, existsSync } from "fs"
import { getTimeIntervals } from "./util.server"
import { DuckDBResultReader } from "@duckdb/node-api/lib/DuckDBResultReader"

export default class DB {
  private connectionPromise: Promise<DuckDBConnection>
  private repoSanitized: string
  private branchSanitized: string
  public selectedRange: [number, number]

  private static async init(dbPath: string): Promise<DuckDBConnection> {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true })
    const instance = await DuckDBInstance.create(dbPath, { temp_directory: dir })
    const connection = await instance.connect()
    await this.initTables(connection)
    await this.initViews(connection, 0, 1_000_000_000_000)
    return connection
  }

  public static async clearCache() {
    const dir = resolve(os.tmpdir(), "git-truck-cache")
    if (!existsSync(dir)) return
    await fs.rm(dir, { recursive: true, force: true })
  }

  constructor(
    private repo: string,
    private branch: string
  ) {
    this.repoSanitized = repo.replace(/\W/g, "_") + "_"
    this.branchSanitized = branch.replace(/\W/g, "_") + "_"
    const dbPath = resolve(os.tmpdir(), "git-truck-cache", this.repoSanitized, this.branchSanitized + ".db")
    this.connectionPromise = DB.init(dbPath)
    this.selectedRange = [0, 1_000_000_000_000] as [number, number]
  }

  public async disconnect() {
    const connection = await this.connectionPromise
    connection.disconnect()
  }

  public async query(query: string): Promise<ReturnType<DuckDBResultReader["getRowObjects"]>> {
    return (await (await this.connectionPromise).runAndReadAll(query)).getRowObjects()
  }

  public async run(query: string): Promise<void> {
    await (await this.connectionPromise).run(query)
  }

  /**
   * usingTableAppender is a helper function to create an appender and close it after the callback is done.
   * It is useful for inserting large amounts of data into the database efficiently.
   * @param table The table to append to
   * @param callback The callback that will be called with an appender
   * @returns The result of the callback
   */
  public async usingTableAppender(table: string, callback: (appender: DuckDBAppender) => Promise<void>) {
    const appender = await (await this.connectionPromise).createAppender("main", table)
    try {
      await callback(appender)
    } finally {
      appender.close()
    }
  }

  public async checkpoint() {
    await await this.run("CHECKPOINT;")
  }

  private static async initTables(db: DuckDBConnection) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS commits (
        hash VARCHAR,
        author VARCHAR,
        committertime UINTEGER,
        authortime UINTEGER
      );
      CREATE TABLE IF NOT EXISTS filechanges (
        commithash VARCHAR,
        insertions UINTEGER,
        deletions UINTEGER,
        filepath VARCHAR,
      );
      CREATE TABLE IF NOT EXISTS authorunions (
        alias VARCHAR PRIMARY KEY,
        actualname VARCHAR
      );
      CREATE TABLE IF NOT EXISTS renames (
        fromname VARCHAR,
        toname VARCHAR,
        timestamp UINTEGER,
        timestampauthor UINTEGER
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
      CREATE TABLE IF NOT EXISTS files (
        path VARCHAR
      );
    `)
  }

  public async clearAllTables() {
    await this.run(`
      DELETE FROM commits;
      DELETE FROM filechanges;
      DELETE FROM authorunions;
      DELETE FROM renames;
      DELETE FROM hiddenfiles;
      DELETE FROM metadata;
      DELETE FROM temporary_renames;
      DELETE FROM files;
    `)
  }

  public async createIndexes() {
    await this.run(`
      CREATE INDEX IF NOT EXISTS commitstime ON commits(committertime);
      CREATE INDEX IF NOT EXISTS renamestime ON renames(timestamp);
    `)
  }

  private static async initViews(db: DuckDBConnection, start: number, end: number) {
    await db.run(/*sql*/ `
      CREATE OR REPLACE VIEW commits_unioned AS
      SELECT c.hash, CASE WHEN u.actualname IS NOT NULL THEN u.actualname ELSE c.author END AS author, c.committertime, c.authortime FROM
      commits c LEFT JOIN authorunions u ON c.author = u.alias
      WHERE c.committertime BETWEEN ${start} AND ${end};

      CREATE OR REPLACE VIEW filechanges_commits AS
      SELECT f.commithash, f.insertions, f.deletions, f.filepath, author, c.committertime, c.authortime FROM
      filechanges f JOIN commits_unioned c on f.commithash = c.hash;

      CREATE OR REPLACE VIEW filechanges_commits_renamed AS
      SELECT f.commithash, f.insertions, f.deletions, f.author, f.committertime, f.authortime,
          CASE
              WHEN r.toname IS NOT NULL THEN r.toname
              ELSE f.filepath
          END AS filepath
      FROM filechanges_commits f
      LEFT JOIN temporary_renames r ON f.filepath = r.fromname
      AND (
        f.committertime BETWEEN r.timestamp AND r.timestampend
        --OR (f.committertime = r.timestampend + 1
        --AND f.authortime < r.timestampend)
      );

      CREATE OR REPLACE VIEW filtered_files AS
      SELECT f.path
      FROM files f
      LEFT JOIN hiddenfiles g ON
          (g.path LIKE '*.%' AND f.path GLOB g.path)
          OR (g.path NOT LIKE '*.%' AND f.path GLOB g.path || '*')
      WHERE g.path IS NULL;


      CREATE OR REPLACE VIEW filechanges_commits_renamed_files AS
      SELECT * FROM filechanges_commits_renamed f
      INNER JOIN filtered_files fi on fi.path = f.filepath;

      CREATE OR REPLACE VIEW relevant_renames AS
      SELECT fromname, toname, min(timestamp) AS timestamp, timestampauthor FROM renames
      WHERE timestamp BETWEEN ${start} AND ${end}
      group by fromname, toname, timestampauthor;

      CREATE OR REPLACE VIEW combined_result AS
      SELECT f.commithash, f.insertions, f.deletions, c.committertime, c.authortime,
        CASE WHEN u.actualname IS NOT NULL THEN u.actualname ELSE c.author END AS author,
        CASE
            WHEN r.toname IS NOT NULL THEN r.toname
            ELSE f.filepath
        END AS filepath
      FROM commits c
      LEFT JOIN authorunions u ON c.author = u.alias
      JOIN filechanges f ON f.commithash = c.hash
      LEFT JOIN temporary_renames r ON f.filepath = r.fromname AND c.committertime BETWEEN r.timestamp AND r.timestampend
      INNER JOIN files fi on fi.path = filepath
      WHERE c.committertime BETWEEN ${start} AND ${end}

    `)
  }

  public async updateTimeInterval(timeSeriesStart: number, timeSeriesEnd: number) {
    const start = Number.isNaN(timeSeriesStart) ? 0 : timeSeriesStart
    const end = Number.isNaN(timeSeriesEnd) ? 1_000_000_000_000 : timeSeriesEnd
    this.selectedRange = [start, end]
    await DB.initViews(await this.connectionPromise, start, end)
  }

  public async replaceAuthorUnions(unions: string[][]) {
    await this.run(`
      DELETE FROM authorunions;
    `)
    await this.usingTableAppender("authorunions", async (appender) => {
      for (const union of unions) {
        const [actualname, ...aliases] = union
        for (const alias of aliases) {
          appender.appendVarchar(alias)
          appender.appendVarchar(actualname)
          appender.endRow()
        }
      }
    })
  }

  public async replaceTemporaryRenames(renames: RenameInterval[]) {
    await this.run(`
      DELETE FROM temporary_renames;
    `)

    await this.usingTableAppender("temporary_renames", async (appender) => {
      for (const rename of renames) {
        rename.fromname ? appender.appendVarchar(rename.fromname) : appender.appendDefault()
        rename.toname ? appender.appendVarchar(rename.toname) : appender.appendDefault()
        appender.appendUInteger(rename.timestamp)
        appender.appendUInteger(rename.timestampend)
        appender.endRow()
      }
    })
  }

  public async getAuthorUnions(): Promise<string[][]> {
    const res = (
      await (
        await this.connectionPromise
      ).runAndReadAll(`
      SELECT actualname, LIST(alias) as aliases FROM authorunions GROUP BY actualname;
    `)
    ).getRowObjects()
    return res.map((row) => [row["actualname"], ...(row["aliases"] as DuckDBArrayValue).items] as string[])
  }

  public async getRawUnions() {
    const res = await this.query(`
      SELECT * FROM authorunions;
    `)

    return res as { alias: string; actualname: string }[]
  }

  public async getCommitTimeAtIndex(idx: number) {
    const res = await this.query(`
      SELECT committertime FROM commits ORDER BY committertime DESC OFFSET ${idx} LIMIT 1;
    `)
    return res.length > 0 ? Number(res[0]["committertime"]) : 0
  }

  public async getOverallTimeRange() {
    const res = await this.query(`
      SELECT MIN(committertime) as min, MAX(committertime) as max from commits;
    `)
    return [Number(res[0]["min"]), Number(res[0]["max"])] as [number, number]
  }

  public async getCurrentRenameIntervals() {
    const res = await this.query(`
        SELECT * FROM relevant_renames ORDER BY timestamp DESC, timestampauthor DESC;
    `)
    return res.map((row) => {
      return {
        fromname: row["fromname"] as string | null,
        toname: row["toname"] as string | null,
        timestamp: 0,
        timestampend: Number(row["timestamp"])
      } as RenameInterval
    })
  }

  public async getHiddenFiles() {
    const res = await this.query(`
      SELECT path FROM hiddenfiles ORDER BY path ASC;
    `)
    return res.map((row) => row["path"] as string)
  }

  public async replaceHiddenFiles(hiddenFiles: string[]) {
    await this.run(`
      DELETE FROM hiddenfiles;
    `)

    await this.usingTableAppender("hiddenfiles", async (appender) => {
      for (const path of hiddenFiles) {
        appender.appendVarchar(path)
        appender.endRow()
      }
    })
  }

  public async getCommits(path: string, count: number) {
    const res = await this.query(`
      SELECT distinct commithash, author, committertime, authortime, message, body
      FROM filechanges_commits_renamed_cached
      WHERE filepath GLOB '${path}*'
      ORDER BY committertime DESC, commithash
      LIMIT ${count};
    `)
    return res.map((row) => {
      return {
        author: row["author"],
        committertime: row["committertime"],
        authortime: row["authortime"],
        body: row["body"],
        hash: row["commithash"],
        message: row["message"]
      } as CommitDTO
    })
  }

  public async getCommitHashes(path: string, count: number) {
    const res = await this.query(`
      SELECT distinct commithash
      FROM filechanges_commits_renamed_cached
      WHERE filepath GLOB '${path}*'
      ORDER BY committertime DESC, commithash
      LIMIT ${count};
    `)
    return res.map((row) => {
      return row["commithash"] as string
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await this.query(`
      SELECT COUNT(DISTINCT commithash) AS count from filechanges_commits_renamed_cached WHERE filepath GLOB '${path}*';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    const res = await this.query(`
      SELECT filepath, count(DISTINCT commithash) AS count
      FROM filechanges_commits_renamed_cached
      GROUP BY filepath
      ORDER BY count DESC;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filepath"] as string] = Number(row["count"])
    })

    return result
  }

  public async getLastChangedPerFile(): Promise<Record<string, number>> {
    const res = await this.query(`
      SELECT filepath, MAX(committertime) AS max_time
      FROM filechanges_commits_renamed_cached
      GROUP BY filepath;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filepath"] as string] = Number(row["max_time"])
    })

    return result
  }

  public async getAuthorCountPerFile(): Promise<Record<string, number>> {
    const res = await this.query(`
      SELECT filepath, count(DISTINCT author) AS author_count
      FROM filechanges_commits_renamed_cached
      GROUP BY filepath;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filepath"] as string] = Number(row["author_count"])
    })

    return result
  }

  public async getMaxMinContribCounts() {
    const res = await this.query(`
      SELECT MAX(contribsum) as max, MIN(contribsum) as min FROM (SELECT filepath, SUM(insertions + deletions) AS contribsum FROM filechanges_commits_renamed_cached GROUP BY filepath);
    `)
    return { max: Number(res[0]["max"]), min: Number(res[0]["min"]) }
  }

  public async getContribSumPerFile(): Promise<Record<string, number>> {
    const res = await this.query(`
      SELECT filepath, SUM(insertions + deletions) AS contribsum FROM filechanges_commits_renamed_cached GROUP BY filepath;
    `)

    return res.reduce<Record<string, number>>((acc, row) => {
      acc[row["filepath"] as string] = Number(row["contribsum"])
      return acc as Record<string, number>
    }, {})
  }

  public async getDominantAuthorPerFile() {
    const res = await this.query(`
      WITH RankedAuthors AS (
        SELECT filepath, author, SUM(insertions + deletions) AS total_contribcount,
        ROW_NUMBER() OVER (PARTITION BY filepath ORDER BY SUM(insertions + deletions) DESC, author ASC) AS rank
        FROM filechanges_commits_renamed_cached
        GROUP BY filepath, author
      )
      SELECT filepath, author, total_contribcount
      FROM RankedAuthors
      WHERE rank = 1;
    `)

    const result: Record<string, { author: string; contribcount: number }> = {}
    res.forEach((row) => {
      const author = row["author"]
      if (typeof author !== "string") {
        throw new Error("Error when getting dominant author per file: Author is not a string")
      }
      result[row["filepath"] as string] = {
        author: author,
        contribcount: Number(row["total_contribcount"])
      }
    })

    return result
  }

  public async updateCachedResult() {
    // TODO: fix combined_result
    await this.run(`
    CREATE OR REPLACE TEMP TABLE filechanges_commits_renamed_cached AS
    SELECT * FROM filechanges_commits_renamed_files;
    `)
  }

  // private async tableRowCount(table: string) {
  //   return (await this.query(`select count (*) as count from ${table};`))[0]["count"]
  // }

  public async addRenames(renames: RenameEntry[]) {
    await this.usingTableAppender("renames", async (appender) => {
      for (const rename of renames) {
        rename.fromname ? appender.appendVarchar(rename.fromname) : appender.appendDefault()
        rename.toname ? appender.appendVarchar(rename.toname) : appender.appendDefault()
        appender.appendUInteger(rename.timestamp)
        appender.appendUInteger(rename.timestampauthor)
        appender.endRow()
      }
    })
  }

  public async replaceFiles(files: RawGitObject[]) {
    await this.run(`
      DELETE FROM files;
    `)
    await this.usingTableAppender("files", async (appender) => {
      for (const file of files) {
        appender.appendVarchar(file.path)
        appender.endRow()
      }
    })
  }

  public async getFiles() {
    const res = await this.query(`
      FROM files;
    `)
    return res.map((row) => row["path"] as string)
  }

  public async commitTableEmpty() {
    const res = await this.query(`
      SELECT * FROM commits LIMIT 1;
    `)
    return res.length === 0
  }

  public async getLatestCommitHash(beforeTime?: number) {
    const res = await this.query(`
      SELECT hash FROM commits WHERE committertime <= ${
        beforeTime ?? 1_000_000_000_000
      } ORDER BY committertime DESC LIMIT 1;
    `)
    if (res.length < 1)
      throw new Error("Could not get latest commit hash. Commits table is empty. beforeTime set to " + beforeTime)
    return res[0]["hash"] as string
  }

  public async getAuthors() {
    const res = await this.query(`
      SELECT DISTINCT author FROM commits_unioned;
    `)
    return res.map((row) => row["author"] as string)
  }

  public async getNewestAndOldestChangeDates() {
    const res = await this.query(`
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filepath, MAX(committertime) AS max_time FROM filechanges_commits_renamed_cached GROUP BY filepath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }

  public async getCommitCount() {
    const res = await this.query(`
      SELECT count(distinct commithash) AS count FROM filechanges_commits_renamed;
    `)
    return Number(res[0]["count"])
  }

  public async getMaxAndMinCommitCount() {
    const res = await this.query(`
      SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filepath, count(distinct commithash) AS count FROM filechanges_commits_renamed_cached GROUP BY filepath ORDER BY count DESC);
    `)
    return { maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"]) }
  }

  public async getAuthorContribsForPath(path: string, isblob: boolean) {
    const res = await this.query(`
      SELECT author, SUM(insertions + deletions) AS contribsum FROM filechanges_commits_renamed_cached WHERE filepath ${
        isblob ? "=" : "GLOB"
      } '${path}${isblob ? "" : "*"}' GROUP BY author ORDER BY contribsum DESC, author ASC;
    `)
    return res.map((row) => {
      return { author: row["author"] as string, contribs: Number(row["contribsum"]) }
    })
  }

  private getTimeStringFormat(timerange: [number, number]) {
    const durationDays = (timerange[1] - timerange[0]) / (60 * 60 * 24)
    if (durationDays < 150) return ["%a %-d %B %Y", "day"]
    if (durationDays < 1000) return ["Week %V %Y", "week"]
    if (durationDays < 4000) return ["%B %Y", "month"]
    return ["%Y", "year"]
  }

  public async getCommitCountPerTime(timerange: [number, number]) {
    const [query, timeUnit] = this.getTimeStringFormat(timerange)
    const res = await this.query(`
      SELECT strftime(date, '${query}') as timestring, count(*) AS count, MIN(committertime) AS ct FROM (SELECT date_trunc('${timeUnit}',to_timestamp(committertime)) AS date, committertime FROM commits) GROUP BY date ORDER BY date ASC;
    `)
    const mapped = res.map((x) => {
      return { date: x["timestring"] as string, count: Number(x["count"]), timestamp: Number(x["ct"]) }
    })
    const final: {
      date: string
      count: number
      timestamp: number
    }[] = []
    const allIntervals = getTimeIntervals(timeUnit, timerange[0], timerange[1])
    for (const [dateString, timestamp] of allIntervals) {
      const existing = mapped.find((x) => x.date === dateString)
      if (existing) final.push(existing)
      else final.push({ date: dateString, count: 0, timestamp })
    }
    const sorted = final.sort((a, b) => a.timestamp - b.timestamp)
    return sorted
  }

  public async updateColorSeed(seed: string) {
    await this.run(`
    DELETE FROM metadata WHERE field = 'colorseed';
      INSERT INTO metadata (field, value, value2) VALUES ('colorseed', null, '${seed}');
      `)
    console.log("inserted seed", seed)
  }

  public async getColorSeed() {
    const res = await this.query(`
      SELECT value2 FROM metadata WHERE field = 'colorseed';
    `)
    if (res.length < 1) return null
    console.log("retrieved seed", res[0]["value2"])
    return res[0]["value2"] as string
  }

  public async getLastRunInfo() {
    const res = await this.query(`
      SELECT value as time, value2 as hash FROM metadata WHERE field = 'finished' ORDER BY value DESC LIMIT 1;
    `)
    if (!res[0]) return { time: 0, hash: "" }
    return { time: Number(res[0]["time"]), hash: res[0]["hash"] as string }
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    await this.usingTableAppender("commits", async (appender) => {
      for (const [hash, commit] of commits) {
        if (!commit) throw new Error(`Commit with hash ${hash} is undefined`)
        appender.appendVarchar(hash)
        appender.appendVarchar(commit.author)
        appender.appendUInteger(commit.committertime)
        appender.appendUInteger(commit.authortime)
        appender.endRow()
      }
    })

    await this.usingTableAppender("filechanges", async (appender) => {
      for (const [hash, commit] of commits) {
        if (!commit) throw new Error(`Commit with hash ${hash} is undefined`)
        for (const change of commit.fileChanges) {
          appender.appendVarchar(commit.hash)
          appender.appendUInteger(change.insertions)
          appender.appendUInteger(change.deletions)
          appender.appendVarchar(change.path)
          appender.endRow()
        }
      }
    })
  }
}
