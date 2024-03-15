import { Database } from "duckdb-async"
import type { CommitDTO, GitLogEntry, RawGitObject, RenameEntry } from "./model"
import os from "os"
import { resolve, dirname } from "path"
import { promises as fs, existsSync } from "fs"
import { DBInserter } from "./DBInserter"

export default class DB {
  private instance: Promise<Database>
  private repoSanitized: string
  private branchSanitized: string

  private static async init(dbPath: string) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) await fs.mkdir(dir, {recursive: true})
    const db = await Database.create(dbPath, {temp_directory: dir})
    await this.initTables(db)
    await this.initViews(db)
    return db
  }

  constructor(private repo: string, private branch: string) {
    this.repoSanitized = repo.replace(/\W/g, "_")
    this.branchSanitized = branch.replace(/\W/g, "_")
    const dbPath = resolve(os.tmpdir(), "git-truck-cache", this.repoSanitized, this.branchSanitized + ".db")
    this.instance = DB.init(dbPath)
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
        authortime UINTEGER,
        body VARCHAR,
        message VARCHAR
      );
      CREATE TABLE IF NOT EXISTS filechanges (
        commithash VARCHAR,
        contribcount UINTEGER,
        filepath VARCHAR,
      );
      CREATE TABLE IF NOT EXISTS authorunions (
        alias VARCHAR PRIMARY KEY,
        actualname VARCHAR
      );
      CREATE TABLE IF NOT EXISTS renames (
        fromname VARCHAR,
        toname VARCHAR,
        timestamp UINTEGER
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

  private static async initViews(db: Database, timeSeriesStart?: number, timeSeriesEnd?: number) {
    const start = !timeSeriesStart || Number.isNaN(timeSeriesStart) ? 0 : timeSeriesStart
    const end = !timeSeriesEnd || Number.isNaN(timeSeriesEnd) ? 1_000_000_000_000 : timeSeriesEnd
    await db.all(`
      CREATE OR REPLACE VIEW commits_unioned AS
      SELECT c.hash, CASE WHEN u.actualname IS NOT NULL THEN u.actualname ELSE c.author END AS author, c.committertime, c.authortime, c.body, c.message FROM
      commits c LEFT JOIN authorunions u ON c.author = u.alias
      WHERE c.committertime BETWEEN ${start} AND ${end};

      CREATE OR REPLACE VIEW filechanges_commits AS
      SELECT f.commithash, f.contribcount, f.filepath, author, c.committertime, c.authortime, c.message, c.body FROM
      filechanges f JOIN commits_unioned c on f.commithash = c.hash
      WHERE c.committertime BETWEEN ${start} AND ${end};

      CREATE OR REPLACE VIEW processed_renames AS
      SELECT 
          tr1.fromname AS fromname, 
          tr1.toname AS toname, 
          MIN(tr1.timestamp) AS timestamp, 
          MAX(tr2.timestampend) AS timestampend
      FROM 
          temporary_renames tr1
      JOIN 
          temporary_renames tr2 ON tr1.fromname = tr2.fromname AND tr1.toname = tr2.toname
      WHERE 
          tr1.timestamp <= tr2.timestampend 
          AND tr2.timestamp >= tr1.timestamp
      GROUP BY 
          tr1.fromname, tr1.toname;

      CREATE OR REPLACE VIEW filechanges_commits_renamed AS
      SELECT f.commithash, f.contribcount, f.author, f.committertime, f.authortime, f.message, f.body,
          CASE
              WHEN r.toname IS NOT NULL THEN r.toname
              ELSE f.filepath
          END AS filepath
      FROM filechanges_commits f
      LEFT JOIN processed_renames r ON f.filepath = r.fromname
                    AND (
                      (f.committertime >= r.timestamp 
                      AND f.committertime <= r.timestampend)
                      OR (f.committertime = r.timestampend + 1
                      AND f.authortime < r.timestampend)
                    );

      CREATE OR REPLACE VIEW filechanges_commits_renamed_files AS
      SELECT * FROM filechanges_commits_renamed f
      INNER JOIN files fi on fi.path = f.filepath;

      CREATE OR REPLACE VIEW relevant_renames AS
      SELECT * FROM renames
      WHERE timestamp BETWEEN ${start} AND ${end};
    `)
  }

  public async updateTimeInterval(start: number, end: number) {
    await DB.initViews(await this.instance, start, end)
  }

  public async replaceAuthorUnions(unions: string[][]) {
    await (await this.instance).all(`
      DELETE FROM authorunions;
    `)

    const inserter = new DBInserter<string>("authorunions", ["alias", "actualname"], this.instance)

    for (const union of unions) {
      const [actualname, ...aliases] = union
      for (const alias of aliases) {
        await inserter.addRow(alias, actualname)
      }
    }
    await inserter.finalize()
  }

  public async replaceTemporaryRenames(renames: RenameEntry[]) {
    await (await this.instance).all(`
      DELETE FROM temporary_renames;
    `)

    const inserter = new DBInserter<string|number|null>("temporary_renames", ["fromname", "toname", "timestamp", "timestampend"], this.instance)

    for (const rename of renames) await inserter.addRow(rename.originalToName, rename.toname, rename.timestamp, rename.timestampEnd ?? null)
    await inserter.finalize()
  }
  
  public async getAuthorUnions() {
    const res = await (await this.instance).all(`
      SELECT actualname, LIST(alias) as aliases FROM authorunions GROUP BY actualname;
    `)
    return res.map((row) => [row["actualname"] as string, ...(row["aliases"] as string[])])
  }
  
  public async getTimeRange() {
    const res = await (await this.instance).all(`
      SELECT MIN(committertime) as min, MAX(committertime) as max from commits;
    `)
    return [Number(res[0]["min"]), Number(res[0]["max"])] as [number, number]
  }
  
  public async getCurrentRenames() {
    const res = await (await this.instance).all(`
      SELECT * FROM relevant_renames;
    `)
    return res.map((row) => {
      return {
        fromname: row["fromname"] as string,
        toname: row["toname"] as string,
        timestamp: Number(row["timestamp"]),
        originalToName: row["toname"] as string,
      } as RenameEntry
    })
  }

  public async getHiddenFiles() {
    const res = await (await this.instance).all(`
      SELECT path FROM hiddenfiles ORDER BY path ASC;
    `)
    return res.map(row => row["path"] as string)
    }

  public async replaceHiddenFiles(hiddenFiles: string[]) {
    await (await this.instance).all(`
      DELETE FROM hiddenfiles;
    `)

    const inserter = new DBInserter<string>("hiddenfiles", ["path"], this.instance)
    for (const file of hiddenFiles) await inserter.addRow(file)
    await inserter.finalize()
  }

  public async getCommits(path: string, count: number) {
    const res = await (await this.instance).all(`
      SELECT distinct commithash, author, committertime, message, body 
      FROM filechanges_commits_renamed_cached
      WHERE filepath LIKE '${path}%'
      ORDER BY committertime DESC, commithash
      LIMIT ${count};
    `)
    return res.map((row) => {
      return {author: row["author"], committertime: row["committertime"], authortime: row["authortime"], body: row["body"], hash: row["commithash"], message: row["message"]} as CommitDTO
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await (await this.instance).all(`
      SELECT COUNT(DISTINCT commithash) AS count from filechanges_commits_renamed_cached WHERE filepath LIKE '${path}%';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    const res = await (await this.instance).all(`
      SELECT filepath, count(DISTINCT commithash) AS count FROM filechanges_commits_renamed_cached GROUP BY filepath ORDER BY count DESC;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["count"])]
    }))
  }
  
  public async getLastChangedPerFile() {
    const res = await (await this.instance).all(`
      SELECT filepath, MAX(committertime) AS max_time FROM filechanges_commits_renamed_cached GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["max_time"])]
    }))
  }
  
  public async getAuthorCountPerFile() {
    // TODO: handle coauthors
    const res = await (await this.instance).all(`
      SELECT filepath, count(DISTINCT author) AS author_count FROM filechanges_commits_renamed_cached GROUP BY filepath;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, Number(row["author_count"])]
    }))
  }
  
  public async getDominantAuthorPerFile() {
    const res = await (await this.instance).all(`
      WITH RankedAuthors AS (
        SELECT filepath, author, SUM(contribcount) AS total_contribcount,
        ROW_NUMBER() OVER (PARTITION BY filepath ORDER BY SUM(contribcount) DESC, author ASC) AS rank 
        FROM filechanges_commits_renamed_cached
        GROUP BY filepath, author
      )
      SELECT filepath, author
      FROM RankedAuthors
      WHERE rank = 1;
    `)
    return new Map(res.map((row) => {
      return [row["filepath"] as string, row["author"] as string]
    }))
  }
    
    public async updateCachedResult() {
      await (await this.instance).all(`
        CREATE OR REPLACE TEMP TABLE filechanges_commits_renamed_cached AS
        SELECT * FROM filechanges_commits_renamed_files;
      `)
    }

  public async addRenames(renames: RenameEntry[]) {
    const inserter = new DBInserter<string|number|null>("renames", ["fromname", "toname", "timestamp"], this.instance)
    for (const rename of renames) await inserter.addRow(rename.fromname, rename.toname, rename.timestamp)
    await inserter.finalize()
  }

  public async replaceFiles(files: RawGitObject[]) {
    await (await this.instance).all(`
      DELETE FROM files;
    `)
    const inserter = new DBInserter<string>("files", ["path"], this.instance)
    for (const file of files) {
      if (file.type === "blob") await inserter.addRow(file.path)
    }
    await inserter.finalize()
  }

  public async getLatestCommitHash(beforeTime?: number) {
    const res = await (await this.instance).all(`
      SELECT hash FROM commits WHERE committertime <= ${beforeTime ?? 1_000_000_000_000} ORDER BY committertime DESC LIMIT 1;
    `)
    return res[0]["hash"] as string
  }

  public async hasCompletedPreviously() {
    const res = await (await this.instance).all(`
      SELECT count(*) as count FROM metadata WHERE field = 'finished';
    `)
    return res[0]["count"] > 0
  }

  public async getAuthors() {
    const res = await (await this.instance).all(`
      SELECT DISTINCT author FROM commits_unioned;
    `)
    return res.map(row => row["author"] as string)
  }
  
  public async getNewestAndOldestChangeDates() {
    // TODO: filter out files no longer in file tree
    const res = await (await this.instance).all(`
      SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filepath, MAX(committertime) AS max_time FROM filechanges_commits_renamed_cached GROUP BY filepath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }
  
  public async getMaxAndMinCommitCount() {
    const res = await (await this.instance).all(`
      SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filepath, count(*) AS count FROM filechanges_commits_renamed_cached GROUP BY filepath ORDER BY count DESC);
    `)
    return {maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"])}
  }
  
  public async getAuthorContribsForPath(path: string, isblob: boolean) {
    const res = await (await this.instance).all(`
      SELECT author, SUM(contribcount) AS contribsum FROM filechanges_commits_renamed_cached WHERE filepath ${isblob ? "=" : "LIKE"} '${path}${isblob ? "" : "%"}' GROUP BY author ORDER BY contribsum DESC, author ASC;
    `)
    return res.map(row => {
      return {author: row["author"] as string, contribs: Number(row["contribsum"])}
    })
  }

  public async setFinishTime() {
    // TODO: also have metadata for table format, to rerun if data model changed
    const latestHash = (await (await this.instance).all(`SELECT hash FROM commits ORDER BY committertime DESC LIMIT 1;`))[0]["hash"] as string
    await (await this.instance).all(`
      INSERT INTO metadata (field, value, value2) VALUES ('finished', ${Date.now()}, '${latestHash}');
    `)
  }
  
  public async updateColorSeed(seed: string) {
    await (await this.instance).all(`
    DELETE FROM metadata WHERE field = 'colorseed';
      INSERT INTO metadata (field, value, value2) VALUES ('colorseed', null, '${seed}');
      `)
      console.log("inserted seed", seed)
    }
    
  public async getColorSeed() {
    const res = await (await this.instance).all(`
      SELECT value2 FROM metadata WHERE field = 'colorseed';
    `)
    if (res.length < 1) return null
    console.log("retrieved seed", res[0]["value2"])
    return res[0]["value2"] as string
  }

  public async getLastRunInfo() {
    const res = await (await this.instance).all(`
      SELECT value as time, value2 as hash FROM metadata WHERE field = 'finished' ORDER BY value DESC LIMIT 1;
    `)
    if (!res[0]) return {time: 0, hash: ""}
    return {time: Number(res[0]["time"]), hash: res[0]["hash"] as string}
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    const commitInserter = new DBInserter<string|number>("commits", ["hash", "author", "committertime", "authortime", "body", "message"], this.instance)
    const fileChangeInserter = new DBInserter<string|number>("filechanges", ["commithash", "contribcount", "filepath"], this.instance)

    for (const [,commit] of commits) {
      await commitInserter.addRow(commit.hash, commit.author, commit.committertime, commit.authortime, commit.body, commit.message)
      for (const change of commit.fileChanges) {
        await fileChangeInserter.addRow(commit.hash, change.contribs, change.path)
      }
    }
    await commitInserter.finalize()
    await fileChangeInserter.finalize()
  }
}
