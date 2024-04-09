import { Database } from "duckdb-async"
import type { CommitDTO, DBFileChange, GitLogEntry, RawGitObject, RenameEntry, RenameInterval } from "./model"
import os from "os"
import { resolve, dirname } from "path"
import { promises as fs, existsSync } from "fs"
import { Inserter } from "./DBInserter"

export default class DB {
  private instance: Promise<Database>
  private repoSanitized: string
  private branchSanitized: string
  public selectedRange: [number, number]|null = null
  private tmpDir: string

  private static async init(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true })
    const db = await Database.create(dbPath, { temp_directory: dir })
    await this.initTables(db)
    await this.initViews(db, 0, 1_000_000_000_000)
    // await db.exec(`INSTALL arrow; LOAD arrow;`)
    return db
  }

  constructor(
    private repo: string,
    private branch: string
  ) {
    this.repoSanitized = repo.replace(/\W/g, "_") + "_"
    this.branchSanitized = branch.replace(/\W/g, "_") + "_"
    const dbPath = resolve(os.tmpdir(), "git-truck-cache", this.repoSanitized, this.branchSanitized + ".db")
    this.tmpDir = resolve(os.tmpdir(), "git-truck-cache", this.repoSanitized, this.branchSanitized)
    this.instance = DB.init(dbPath)
  }

  public async close() {
    await (await this.instance).close()
  }

  public async query(query: string) {
    return await (await this.instance).all(query)
  }

  private static async initTables(db: Database) {
    await db.all(`
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
      CREATE TABLE IF NOT EXISTS authorcolors (
        author VARCHAR,
        color VARCHAR
      );
    `)
  }

  public async createIndexes() {
    await (
      await this.instance
    ).all(`
      CREATE INDEX IF NOT EXISTS commitstime ON commits(committertime);
      CREATE INDEX IF NOT EXISTS renamestime ON renames(timestamp);
    `)
  }

  private static async initViews(db: Database, timeSeriesStart: number, timeSeriesEnd: number) {
    const start = Number.isNaN(timeSeriesStart) ? 0 : timeSeriesStart
    const end = Number.isNaN(timeSeriesEnd) ? 1_000_000_000_000 : timeSeriesEnd

    await db.all(`
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

      CREATE OR REPLACE VIEW filechanges_commits_renamed_files AS
      SELECT * FROM filechanges_commits_renamed f
      INNER JOIN files fi on fi.path = f.filepath;

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

  public async updateTimeInterval(start: number, end: number) {
    this.selectedRange = [start, end]
    await DB.initViews(await this.instance, start, end)
  }

  public async replaceAuthorUnions(unions: string[][]) {
    await (
      await this.instance
    ).all(`
      DELETE FROM authorunions;
    `)
    const ins = Inserter.getSystemSpecificInserter<{alias: string, actualname: string}>("authorunions", this.tmpDir, await this.instance)
    const splitunions: {alias: string, actualname: string}[] = []
    for (const union of unions) {
      const [actualname, ...aliases] = union
      for (const alias of aliases) {
        splitunions.push({alias, actualname})
      }
    }
    await ins.addRows(splitunions)
    await ins.finalize()
  }

  public async replaceTemporaryRenames(renames: RenameInterval[]) {
    await (
      await this.instance
    ).all(`
      DELETE FROM temporary_renames;
    `)

    const ins = Inserter.getSystemSpecificInserter<RenameInterval>("temporary_renames", this.tmpDir, await this.instance)
    await ins.addRows(renames)
    await ins.finalize()
  }

  public async getAuthorUnions() {
    const res = await (
      await this.instance
    ).all(`
      SELECT actualname, LIST(alias) as aliases FROM authorunions GROUP BY actualname;
    `)
    return res.map((row) => [row["actualname"] as string, ...(row["aliases"] as string[])])
  }

  public async getRawUnions() {
    const res = await (
      await this.instance
    ).all(`
      SELECT * FROM authorunions;
    `)

    return res as {alias: string, actualname: string}[]
  }

  public async getCommitTimeAtIndex(idx: number) {
    const res = await (
      await this.instance
    ).all(`
      SELECT committertime FROM commits ORDER BY committertime DESC OFFSET ${idx} LIMIT 1;
    `)
    return res.length > 0 ? Number(res[0]["committertime"]) : 0
  }

  public async getOverallTimeRange() {
    const res = await (
      await this.instance
    ).all(`
      SELECT MIN(committertime) as min, MAX(committertime) as max from commits;
    `)
    return [Number(res[0]["min"]), Number(res[0]["max"])] as [number, number]
  }


  public async getCurrentRenameIntervals() {
    const res = await (await this.instance).all(`
        SELECT * FROM relevant_renames ORDER BY timestamp DESC, timestampauthor DESC;
    `)
    return res.map((row) => {
        return {
            fromname: row["fromname"] as string|null,
            toname: row["toname"] as string|null,
            timestamp: 0,
            timestampend: Number(row["timestamp"]),
        } as RenameInterval
    })
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

  public async getHiddenFiles() {
    const res = await (
      await this.instance
    ).all(`
      SELECT path FROM hiddenfiles ORDER BY path ASC;
    `)
    return res.map((row) => row["path"] as string)
  }

  public async replaceHiddenFiles(hiddenFiles: string[]) {
    await (
      await this.instance
    ).all(`
      DELETE FROM hiddenfiles;
    `)

    const ins = Inserter.getSystemSpecificInserter<{path: string}>("hiddenfiles", this.tmpDir, await this.instance)
    await ins.addRows(hiddenFiles.map(path => {
      return {path: path}
    }))
    await ins.finalize()
  }

  public async getCommits(path: string, count: number) {
    const res = await (
      await this.instance
    ).all(`
      SELECT distinct commithash, author, committertime, authortime, message, body 
      FROM filechanges_commits_renamed_cached
      WHERE filepath LIKE '${path}%'
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
    const res = await (
      await this.instance
    ).all(`
      SELECT distinct commithash
      FROM filechanges_commits_renamed_cached
      WHERE filepath LIKE '${path}%'
      ORDER BY committertime DESC, commithash
      LIMIT ${count};
    `)
    return res.map((row) => {
      return row["commithash"] as string
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await (
      await this.instance
    ).all(`
      SELECT COUNT(DISTINCT commithash) AS count from filechanges_commits_renamed_cached WHERE filepath LIKE '${path}%';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    const res = await (
      await this.instance
    ).all(`
      SELECT filepath, count(DISTINCT commithash) AS count FROM filechanges_commits_renamed_cached GROUP BY filepath ORDER BY count DESC;
    `)
    return new Map(
      res.map((row) => {
        return [row["filepath"] as string, Number(row["count"])]
      })
    )
  }

  public async getLastChangedPerFile() {
    const res = await (
      await this.instance
    ).all(`
      SELECT filepath, MAX(committertime) AS max_time FROM filechanges_commits_renamed_cached GROUP BY filepath;
    `)
    return new Map(
      res.map((row) => {
        return [row["filepath"] as string, Number(row["max_time"])]
      })
    )
  }

  public async getAuthorCountPerFile() {
    // TODO: handle coauthors
    const res = await (
      await this.instance
    ).all(`
      SELECT filepath, count(DISTINCT author) AS author_count FROM filechanges_commits_renamed_cached GROUP BY filepath;
    `)
    return new Map(
      res.map((row) => {
        return [row["filepath"] as string, Number(row["author_count"])]
      })
    )
  }

  public async getDominantAuthorPerFile() {
    const res = await (
      await this.instance
    ).all(`
      WITH RankedAuthors AS (
        SELECT filepath, author, SUM(insertions + deletions) AS total_contribcount,
        ROW_NUMBER() OVER (PARTITION BY filepath ORDER BY SUM(insertions + deletions) DESC, author ASC) AS rank 
        FROM filechanges_commits_renamed_cached
        GROUP BY filepath, author
      )
      SELECT filepath, author
      FROM RankedAuthors
      WHERE rank = 1;
    `)
    return new Map(
      res.map((row) => {
        return [row["filepath"] as string, row["author"] as string]
      })
    )
  }

  public async updateCachedResult() {
    // TODO: fix combined_result
    await (
      await this.instance
    ).all(`
    CREATE OR REPLACE TEMP TABLE filechanges_commits_renamed_cached AS
    SELECT * FROM filechanges_commits_renamed_files;
    `)
  }

  public async addRenames(renames: RenameEntry[]) {
    const ins = Inserter.getSystemSpecificInserter<{fromname: string|null, toname: string|null, timestamp: number, timestampauthor: number}>("renames", this.tmpDir, await this.instance)
    await ins.addRows(renames.map(r => {
      if (!r.timestampauthor)console.log("waddup", r)
      return {
        fromname: r.fromname,
        toname: r.toname,
        timestamp: r.timestamp,
        timestampauthor: r.timestampauthor
      }
    }))
    await ins.finalize()
  }

  public async replaceFiles(files: RawGitObject[]) {
    await (
      await this.instance
    ).all(`
      DELETE FROM files;
    `)
    const ins = Inserter.getSystemSpecificInserter<{path: string}>("files", this.tmpDir, await this.instance)
    await ins.addRows(files.map(x => { return {path: x.path}}))
    await ins.finalize()
  }

  public async getFiles() {
    const res = await (
      await this.instance
    ).all(`
      FROM files;
    `)
    return res.map(row => row["path"] as string)
  }

  public async getLatestCommitHash(beforeTime?: number) {
    const res = await (
      await this.instance
    ).all(`
      SELECT hash FROM commits WHERE committertime <= ${
        beforeTime ?? 1_000_000_000_000
      } ORDER BY committertime DESC LIMIT 1;
    `)
    return res[0]["hash"] as string
  }

  public async hasCompletedPreviously() {
    const res = await (
      await this.instance
    ).all(`
      SELECT count(*) as count FROM metadata WHERE field = 'finished';
    `)
    const num = Number(res[0]["count"])
    return num > 0
  }

  public async getAuthors() {
    const res = await (
      await this.instance
    ).all(`
      SELECT DISTINCT author FROM commits_unioned;
    `)
    return res.map((row) => row["author"] as string)
  }

  public async getNewestAndOldestChangeDates() {
    const res = await (
      await this.instance
    ).all(`
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filepath, MAX(committertime) AS max_time FROM filechanges_commits_renamed_cached GROUP BY filepath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }

  public async getMaxAndMinCommitCount() {
    const res = await (
      await this.instance
    ).all(`
      SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filepath, count(*) AS count FROM filechanges_commits_renamed_cached GROUP BY filepath ORDER BY count DESC);
    `)
    return { maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"]) }
  }

  public async getAuthorContribsForPath(path: string, isblob: boolean) {
    const res = await (
      await this.instance
    ).all(`
      SELECT author, SUM(insertions + deletions) AS contribsum FROM filechanges_commits_renamed_cached WHERE filepath ${
        isblob ? "=" : "LIKE"
      } '${path}${isblob ? "" : "%"}' GROUP BY author ORDER BY contribsum DESC, author ASC;
    `)
    return res.map((row) => {
      return { author: row["author"] as string, contribs: Number(row["contribsum"]) }
    })
  }

  public async setFinishTime() {
    // TODO: also have metadata for table format, to rerun if data model changed
    const latestHash = await this.getLatestCommitHash()
    await (
      await this.instance
    ).all(`
      INSERT INTO metadata (field, value, value2) VALUES ('finished', ${Date.now()}, '${latestHash}');
    `)
  }

  private getTimeStringFormat(timerange: [number, number]) {
    const durationDays = (timerange[1] - timerange[0]) / (60 * 60 * 24)
    if (durationDays < 150) return ['%a, %-d %B %Y', 'day']
    if (durationDays < 1000) return ['Week %V %Y', 'week']
    if (durationDays < 4000) return ['%B %Y', 'month']
    return ['%Y', 'year']
  }

  // TODO: add dates/months/weeks/years that have 0 commits
  public async getCommitCountPerTime(timerange: [number, number]) {
    const [query, timeUnit] = this.getTimeStringFormat(timerange)
    const res = await (
      await this.instance
    ).all(`
      SELECT strftime(date, '${query}') as timestring, count(*) AS count FROM (SELECT date_trunc('${timeUnit}',to_timestamp(committertime)) AS date FROM commits) GROUP BY date ORDER BY date ASC;
    `)
    return res.map(x => {
      return { date: x["timestring"] as string, count: Number(x["count"])}
    })
  }

  public async updateColorSeed(seed: string) {
    await (
      await this.instance
    ).all(`
    DELETE FROM metadata WHERE field = 'colorseed';
      INSERT INTO metadata (field, value, value2) VALUES ('colorseed', null, '${seed}');
      `)
    console.log("inserted seed", seed)
  }

  public async getColorSeed() {
    const res = await (
      await this.instance
    ).all(`
      SELECT value2 FROM metadata WHERE field = 'colorseed';
    `)
    if (res.length < 1) return null
    console.log("retrieved seed", res[0]["value2"])
    return res[0]["value2"] as string
  }

  public async getLastRunInfo() {
    const res = await (
      await this.instance
    ).all(`
      SELECT value as time, value2 as hash FROM metadata WHERE field = 'finished' ORDER BY value DESC LIMIT 1;
    `)
    if (!res[0]) return { time: 0, hash: "" }
    return { time: Number(res[0]["time"]), hash: res[0]["hash"] as string }
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    const commitInserter = Inserter.getSystemSpecificInserter<CommitDTO>("commits", this.tmpDir, await this.instance)
    const fileChangeInserter = Inserter.getSystemSpecificInserter<DBFileChange>("filechanges", this.tmpDir, await this.instance)

    for (const [, commit] of commits) {
      await commitInserter.addRow({
        hash: commit.hash,
        author: commit.author,
        committertime: commit.committertime,
        authortime: commit.authortime
      })
      for (const change of commit.fileChanges) {
          await fileChangeInserter.addRow({
            commithash: commit.hash, 
            insertions: change.insertions, 
            deletions: change.deletions,
            filepath: change.path
          })
      }
    }
    await commitInserter.finalize()
    await fileChangeInserter.finalize()
  }
}
