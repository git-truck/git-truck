import { DuckDBConnection, DuckDBAppender, DuckDBInstance } from "@duckdb/node-api"
import type {
  AbstractGitObject,
  CommitDTO,
  ContributorGroup,
  GitLogEntry,
  GitObject,
  Person,
  RawGitObject,
  RenameEntry,
  RenameInterval
} from "~/shared/model"
import { getTimeIntervals } from "~/shared/util.ts"
import { DuckDBResultReader } from "@duckdb/node-api/lib/DuckDBResultReader.js"
import { log } from "~/server/log"

export default class DB {
  private instance: DuckDBInstance
  private connection: DuckDBConnection
  public selectedRange: [number, number]

  public async init(): Promise<DB> {
    await this.initTables()
    await this.initViews(0, 1_000_000_000_000)
    return this
  }

  constructor({ instance, connection }: { instance: DuckDBInstance; connection: DuckDBConnection }) {
    this.instance = instance
    this.connection = connection
    this.selectedRange = [0, 1_000_000_000_000] as [number, number]
  }

  public async close() {
    this.connection.disconnectSync()
    this.instance.closeSync()
  }

  public async query(query: string): Promise<ReturnType<DuckDBResultReader["getRowObjects"]>> {
    log.debug("query:", query.trim().replaceAll(/\s+/g, " "))
    return (await this.connection.runAndReadAll(query)).getRowObjects()
  }

  public async prepare(query: string) {
    log.debug("prepare:", query.trim().replaceAll(/\s+/g, " "))
    return this.connection.prepare(query)
  }

  private async usingPreparedStatement<T>(
    query: string,
    callback: (statement: Awaited<ReturnType<DB["prepare"]>>) => Promise<T>,
    label?: string
  ): Promise<T> {
    let statement: Awaited<ReturnType<DB["prepare"]>> | null = null
    const tag = label ? ` (${label})` : ""

    try {
      statement = await this.prepare(query)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to prepare statement${tag}: ${message}\nSQL: ${query.trim()}`, {
        cause: error instanceof Error ? error : undefined
      })
    }

    try {
      return await callback(statement)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to execute prepared statement${tag}: ${message}\nSQL: ${query.trim()}`, {
        cause: error instanceof Error ? error : undefined
      })
    } finally {
      statement.destroySync()
    }
  }

  public async run(query: string): Promise<void> {
    log.debug("run:", query.trim().replaceAll(/\s+/g, " "))
    await this.connection.run(query)
  }

  /**
   * usingTableAppender is a helper function to create an appender and close it after the callback is done.
   * It is useful for inserting large amounts of data into the database efficiently.
   * @param table The table to append to
   * @param callback The callback that will be called with an appender
   * @returns The result of the callback
   */
  public async usingTableAppender(table: string, callback: (appender: DuckDBAppender) => Promise<void>) {
    const appender = await this.connection.createAppender(table)
    try {
      await callback(appender)
    } finally {
      appender.closeSync()
    }
  }

  public async checkpoint() {
    await this.run("CHECKPOINT;")
  }

  private async initTables() {
    await this.connection.run(/*sql*/ `
      CREATE TABLE IF NOT EXISTS commits (
        hash VARCHAR,
        author VARCHAR,
        authorEmail VARCHAR,
        committerTime UINTEGER,
        authorTime UINTEGER
      );
      CREATE TABLE IF NOT EXISTS fileChanges (
        commitHash VARCHAR,
        insertions UINTEGER,
        deletions UINTEGER,
        filePath VARCHAR,
      );
      CREATE TABLE IF NOT EXISTS commitTrailers (
        commitHash VARCHAR,
        name VARCHAR,
        email VARCHAR,
        trailerType VARCHAR
      );
      CREATE TABLE IF NOT EXISTS contributorGroups (
        displayName VARCHAR,
        email VARCHAR,
        name VARCHAR
      );
      CREATE TABLE IF NOT EXISTS renames (
        fromName VARCHAR,
        toName VARCHAR,
        timestamp UINTEGER,
        timestampAuthor UINTEGER
      );

      CREATE SEQUENCE IF NOT EXISTS hiddenFiles_id_sequence START 1;

      CREATE TABLE IF NOT EXISTS hiddenFiles (
        id INTEGER DEFAULT nextval('hiddenFiles_id_sequence'),
        path VARCHAR
      );
      CREATE TABLE IF NOT EXISTS metadata (
        field VARCHAR,
        intValue UBIGINT,
        stringValue VARCHAR
      );
      CREATE TABLE IF NOT EXISTS temporaryRenames (
        fromName VARCHAR,
        toName VARCHAR,
        timestamp UINTEGER,
        timestampEnd UINTEGER
      );
      CREATE TABLE IF NOT EXISTS files (
        path VARCHAR,
        hash VARCHAR,
        type VARCHAR,
        sizeInBytes UINTEGER
      );

    `)
  }

  public async getDbConnection(): Promise<DuckDBConnection> {
    return this.connection
  }

  public async clearAllTables() {
    await this.run(/*sql*/ `
      DELETE FROM commits;
      DELETE FROM fileChanges;
      DELETE FROM commitTrailers;
      DELETE FROM contributorGroups;
      DELETE FROM renames;
      DELETE FROM hiddenFiles;
      DELETE FROM metadata;
      DELETE FROM temporaryRenames;
      DELETE FROM files;`)
  }

  public async createIndexes() {
    await this.run(/*sql*/ `
      CREATE INDEX IF NOT EXISTS commitsTime ON commits(committerTime);
      CREATE INDEX IF NOT EXISTS renamesTime ON renames(timestamp);`)
  }

  private async initViews(start: number, end: number) {
    await this.connection.run(/*sql*/ `
      CREATE OR REPLACE VIEW commits_unioned AS
      SELECT c.hash, CASE WHEN cg.displayName IS NOT NULL THEN cg.displayName ELSE c.author END AS author, c.authorEmail, c.committerTime, c.authorTime FROM
      commits c LEFT JOIN (SELECT displayName, email, name FROM contributorGroups) cg
      ON (c.author = cg.name AND c.authorEmail = cg.email)
      WHERE c.committerTime BETWEEN ${start} AND ${end};

      CREATE OR REPLACE VIEW fileChanges_commits AS
      SELECT f.commitHash, f.insertions, f.deletions, f.filePath, author, c.authorEmail, c.committerTime, c.authorTime FROM
      fileChanges f JOIN commits_unioned c on f.commitHash = c.hash;

      CREATE OR REPLACE VIEW commitTrailers_unioned AS
      SELECT co.commitHash, CASE WHEN u.displayName IS NOT NULL THEN u.displayName ELSE co.name END AS name, co.email, co.trailerType FROM
      commitTrailers AS co LEFT JOIN (SELECT displayName, email, name FROM contributorGroups) AS u
      ON (co.name = u.name AND co.email = u.email);

      CREATE OR REPLACE VIEW fileChanges_commits_renamed AS
      SELECT f.commitHash, f.insertions, f.deletions, f.author, f.authorEmail, f.committerTime, f.authorTime,
          CASE
              WHEN r.toName IS NOT NULL THEN r.toName
              ELSE f.filePath
          END AS filePath
      FROM fileChanges_commits f
      LEFT JOIN temporaryRenames r ON f.filePath = r.fromName
      AND (
        f.committerTime BETWEEN r.timestamp AND r.timestampEnd
        --OR (f.committerTime = r.timestampEnd + 1
        --AND f.authorTime < r.timestampEnd)
      );

      CREATE OR REPLACE VIEW filtered_files AS
      SELECT f.path
      FROM files f
      LEFT JOIN hiddenFiles g ON
          (g.path LIKE '*.%' AND f.path GLOB g.path)
          OR (g.path NOT LIKE '*.%' AND f.path GLOB g.path || '*')
      WHERE g.path IS NULL;


      CREATE OR REPLACE VIEW fileChanges_commits_renamed_files AS
      SELECT * FROM fileChanges_commits_renamed f
      INNER JOIN filtered_files fi on fi.path = f.filePath;

      CREATE OR REPLACE TEMP TABLE fileChanges_commits_renamed_cached AS
      SELECT * FROM fileChanges_commits_renamed_files;

      CREATE OR REPLACE VIEW relevant_renames AS
      SELECT fromName, toName, min(timestamp) AS timestamp, timestampAuthor FROM renames
      WHERE timestamp BETWEEN ${start} AND ${end}
      group by fromName, toName, timestampAuthor;

      CREATE OR REPLACE VIEW combined_result AS
      SELECT f.commitHash, f.insertions, f.deletions, c.authorEMail, c.committerTime, c.authorTime,
        CASE WHEN cg.displayName IS NOT NULL THEN cg.displayName ELSE c.author END AS author,
        CASE
            WHEN r.toName IS NOT NULL THEN r.toName
            ELSE f.filePath
        END AS filePath
      FROM commits c
      LEFT JOIN (SELECT displayName, email, name FROM contributorGroups) cg
      ON (c.author = cg.name AND c.authorEMail = cg.email)
      JOIN fileChanges f ON f.commitHash = c.hash
      LEFT JOIN temporaryRenames r ON f.filePath = r.fromName AND c.committerTime BETWEEN r.timestamp AND r.timestampEnd
      INNER JOIN files fi on fi.path = filePath
      WHERE c.committerTime BETWEEN ${start} AND ${end}

    `)
  }

  public async updateTimeInterval(timeSeriesStart: number, timeSeriesEnd: number) {
    const start = Number.isNaN(timeSeriesStart) ? 0 : timeSeriesStart
    const end = Number.isNaN(timeSeriesEnd) ? 1_000_000_000_000 : timeSeriesEnd
    this.selectedRange = [start, end]
    await this.initViews(start, end)
  }

  public async replaceContributorGroups(groups: ContributorGroup[]) {
    await this.run(`
      DELETE FROM contributorGroups;
    `)

    await this.usingTableAppender("contributorGroups", async (appender) => {
      const seen = new Set<string>()

      for (const union of groups) {
        for (const alias of union.members) {
          const email = alias.email ?? ""
          const key = `${union.displayName}\u0000${alias.name}\u0000${email}`
          if (seen.has(key)) continue
          seen.add(key)

          appender.appendVarchar(union.displayName)
          appender.appendVarchar(email)
          appender.appendVarchar(alias.name)
          appender.endRow()
        }
      }
    })
  }

  public async replaceTemporaryRenames(renames: RenameInterval[]) {
    await this.run(`
      DELETE FROM temporaryRenames;
    `)

    await this.usingTableAppender("temporaryRenames", async (appender) => {
      for (const rename of renames) {
        if (rename.fromName) {
          appender.appendVarchar(rename.fromName)
        } else {
          appender.appendDefault()
        }
        if (rename.toName) {
          appender.appendVarchar(rename.toName)
        } else {
          appender.appendDefault()
        }
        appender.appendUInteger(rename.timestamp)
        appender.appendUInteger(rename.timestampEnd)
        appender.endRow()
      }
    })
  }

  public async getAuthorUnions(): Promise<ContributorGroup[]> {
    const res = await this.query(`SELECT displayName, email, name FROM contributorGroups;`)

    const groupsByName = new Map<string, Person[]>()
    res.forEach((row) => {
      const displayName = row["displayName"] as string
      const name = row["name"] as string
      const email = row["email"] as string
      const person: Person = { name, email }
      const existing = groupsByName.get(displayName)
      if (existing) {
        existing.push(person)
      } else {
        groupsByName.set(displayName, [person])
      }
    })

    return Array.from(groupsByName.entries()).map(([displayName, members]) => ({
      displayName,
      members
    }))
  }

  public async getRawUnions() {
    const res = await this.query(`SELECT displayName, email, name FROM contributorGroups;`)

    return res as { displayName: string; email: string; name: string }[]
  }

  public async getCommitTimeAtIndex(idx: number) {
    const res = await this.query(`SELECT committerTime FROM commits ORDER BY committerTime DESC OFFSET ${idx} LIMIT 1;
    `)
    return res.length > 0 ? Number(res[0]["committerTime"]) : 0
  }

  public async getOverallTimeRange() {
    const res = await this.query(`SELECT MIN(committerTime) as min, MAX(committerTime) as max from commits;
    `)
    return [Number(res[0]["min"]), Number(res[0]["max"])] as [number, number]
  }

  public async getCurrentRenameIntervals() {
    const res = await this.query(`SELECT * FROM relevant_renames ORDER BY timestamp DESC, timestampAuthor DESC;
    `)
    return res.map((row) => {
      return {
        fromName: row["fromName"] as string | null,
        toName: row["toName"] as string | null,
        timestamp: 0,
        timestampEnd: Number(row["timestamp"])
      } as RenameInterval
    })
  }

  public async getHiddenFiles() {
    const res = await this.query(`SELECT path, id FROM hiddenFiles ORDER BY id DESC;`)
    return res.map((row) => row["path"] as string)
  }

  public async addHiddenFile(path: string) {
    await this.usingPreparedStatement(
      `INSERT INTO hiddenFiles (id, path)
       SELECT nextval('hiddenFiles_id_sequence'), ?
       WHERE NOT EXISTS (
         SELECT 1 FROM hiddenFiles WHERE path = ?
       );
    `,
      async (statement) => {
        statement.bindVarchar(1, path)
        statement.bindVarchar(2, path)
        await statement.run()
      },
      "addHiddenFile"
    )
  }

  public async removeHiddenFile(path: string) {
    await this.usingPreparedStatement(
      `DELETE FROM hiddenFiles
      WHERE path = ?;
    `,
      async (statement) => {
        statement.bindVarchar(1, path)
        await statement.run()
      },
      "removeHiddenFile"
    )
  }

  public async clearHiddenFiles() {
    await this.run(`DELETE FROM hiddenFiles;`)
  }

  public async getCommits(path: string, count: number) {
    const res = await this.query(
      `SELECT distinct commitHash, author, authorEmail, committerTime, authorTime, message, body
       FROM fileChanges_commits_renamed_cached
       WHERE filePath GLOB '${path}*'
       ORDER BY committerTime DESC, commitHash
       LIMIT ${count};
    `
    )
    return res.map((row) => {
      return {
        author: {
          name: String(row["author"]),
          email: String(row["authorEmail"])
        },
        committerTime: row["committerTime"],
        authorTime: row["authorTime"],
        body: row["body"],
        hash: row["commitHash"],
        message: row["message"]
      } as CommitDTO
    })
  }

  public async getCommitHashes(path: string, count: number) {
    const res = await this.query(`SELECT distinct commitHash
      FROM fileChanges_commits_renamed_cached
      WHERE filePath GLOB '${path}*'
      ORDER BY committerTime DESC, commitHash
      LIMIT ${count};
    `)
    return res.map((row) => {
      return row["commitHash"] as string
    })
  }

  public async getCommitCountForPath(path: string) {
    const res = await this
      .query(`SELECT COUNT(DISTINCT commitHash) AS count from fileChanges_commits_renamed_cached WHERE filePath GLOB '${path}*';
    `)
    return Number(res[0]["count"])
  }

  public async getCommitCountPerFile() {
    const res = await this.query(`SELECT filePath, count(DISTINCT commitHash) AS count
      FROM fileChanges_commits_renamed_cached
      GROUP BY filePath
      ORDER BY count DESC;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filePath"] as string] = Number(row["count"])
    })

    return result
  }

  public async getLastChangedPerFile(): Promise<Record<string, number>> {
    const res = await this.query(`SELECT filePath, MAX(committerTime) AS max_time
      FROM fileChanges_commits_renamed_cached
      GROUP BY filePath;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filePath"] as string] = Number(row["max_time"])
    })

    return result
  }

  public async getContributorCountPerFile(): Promise<Record<string, number>> {
    const res = await this.query(/*sql*/ `
      WITH file_people AS (
        SELECT f.filePath, f.author AS person_name, f.authorEmail AS person_email
        FROM filechanges_commits_renamed_cached AS f
        UNION
        SELECT f.filePath, co.name AS person_name, co.email AS person_email
        FROM filechanges_commits_renamed_cached AS f
        INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
        WHERE co.trailerType = 'coauthor'
      )
      SELECT filePath, COUNT(DISTINCT person_name) AS contributorCount
      FROM file_people
      GROUP BY filePath;
    `)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["filePath"] as string] = Number(row["contributorCount"])
    })

    return result
  }

  public async getMaxMinContribCounts() {
    const res = await this
      .query(`SELECT MAX(contribSum) as max, MIN(contribSum) as min FROM (SELECT filePath, SUM(insertions + deletions) AS contribSum FROM fileChanges_commits_renamed_cached GROUP BY filePath);
    `)
    return { max: Number(res[0]["max"]), min: Number(res[0]["min"]) }
  }

  public async getContribSumPerFile(): Promise<Record<string, number>> {
    const res = await this
      .query(`SELECT filePath, SUM(insertions + deletions) AS contribSum FROM fileChanges_commits_renamed_cached GROUP BY filePath;
    `)

    return res.reduce<Record<string, number>>((acc, row) => {
      acc[row["filePath"] as string] = Number(row["contribSum"])
      return acc as Record<string, number>
    }, {})
  }

  public async getUniqueContributorsForPath(objectPath: string): Promise<string[]> {
    //Respects aliases for contributors through commits_unioned view
    const isblob = (await this.getObjectType(objectPath)) === "blob"
    let res: ReturnType<DuckDBResultReader["getRowObjects"]>

    if (isblob) {
      res = await this.usingPreparedStatement(
        /*sql*/ `
      WITH file_contributors AS (
        SELECT f.filePath, f.author AS contributor
        FROM filechanges_commits_renamed_cached AS f
        WHERE f.filePath = ?
        UNION
        SELECT f.filePath, ca.name AS contributor
        FROM filechanges_commits_renamed_cached AS f
        JOIN commitTrailers_unioned AS ca ON f.commitHash = ca.commitHash
        WHERE ca.trailerType = 'coauthor' AND f.filePath = ?
      )
      SELECT DISTINCT contributor
      FROM file_contributors;
    `,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          statement.bindVarchar(2, objectPath)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "getUniqueContributorsForPath(blob)"
      )
    } else if (objectPath) {
      res = await this.usingPreparedStatement(
        /*sql*/ `
      WITH file_contributors AS (
        SELECT f.filePath, f.author AS contributor
        FROM filechanges_commits_renamed_cached AS f
        WHERE f.filePath LIKE ?
        UNION
        SELECT f.filePath, ca.name AS contributor
        FROM filechanges_commits_renamed_cached AS f
        JOIN commitTrailers_unioned AS ca ON f.commitHash = ca.commitHash
        WHERE ca.trailerType = 'coauthor' AND f.filePath LIKE ?
      )
      SELECT DISTINCT contributor
      FROM file_contributors;
    `,
        async (statement) => {
          statement.bindVarchar(1, `${objectPath}/%`)
          statement.bindVarchar(2, `${objectPath}/%`)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "getUniqueContributorsForPath(tree)"
      )
    } else {
      res = await this.query(/*sql*/ `
      WITH file_contributors AS (
        SELECT f.filePath, f.author AS contributor
        FROM filechanges_commits_renamed_cached AS f
        UNION
        SELECT f.filePath, ca.name AS contributor
        FROM filechanges_commits_renamed_cached AS f
        JOIN commitTrailers_unioned AS ca ON f.commitHash = ca.commitHash
        WHERE ca.trailerType = 'coauthor'
      )
      SELECT DISTINCT contributor
      FROM file_contributors;
    `)
    }

    return res.map((row) => row["contributor"] as string)
  }

  public async getContributorContributionsForPath(): Promise<
    Record<string, { contributor: string; contribcount: number }[]>
  > {
    const res = await this.query(/*sql*/ `
      WITH commit_contributors AS (
        SELECT f.filePath, f.commitHash, f.author AS contributor, (f.insertions + f.deletions) AS lineChanges
        FROM fileChanges_commits_renamed_cached AS f
        UNION
        SELECT f.filePath, f.commitHash, co.name AS contributor, (f.insertions + f.deletions) AS lineChanges
        FROM fileChanges_commits_renamed_cached AS f
        INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
        WHERE co.trailerType = 'coauthor' AND co.name <> f.author
      )
      SELECT filePath, contributor, SUM(lineChanges) AS totalContribCount
      FROM commit_contributors
      GROUP BY filePath, contributor;
    `)

    const result: Record<string, { contributor: string; contribcount: number }[]> = {}
    res.forEach((row) => {
      const filePath = row["filePath"] as string
      if (!result[filePath]) {
        result[filePath] = []
      }
      result[filePath].push({
        contributor: row["contributor"] as string,
        contribcount: Number(row["totalContribCount"])
      })
    })

    return result
  }

  public async getTopContributorPerFile() {
    const res = await this.query(/*sql*/ `
      WITH commit_contributors AS (
        SELECT f.filePath, f.commitHash, f.author AS contributor, (f.insertions + f.deletions) AS lineChanges
        FROM fileChanges_commits_renamed_cached AS f
        UNION
        SELECT f.filePath, f.commitHash, co.name AS contributor, (f.insertions + f.deletions) AS lineChanges
        FROM fileChanges_commits_renamed_cached AS f
        INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
        WHERE co.trailerType = 'coauthor' AND (co.name <> f.author)
      ),
      contributor_totals AS (
        SELECT filePath, contributor, SUM(lineChanges) AS totalContribCount
        FROM commit_contributors
        GROUP BY filePath, contributor
      ),
      max_per_file AS (
        SELECT filePath, MAX(totalContribCount) AS maxContribCount
        FROM contributor_totals
        GROUP BY filePath
      ),
      top_ties AS (
        SELECT ct.filePath, COUNT(*) AS topCount
        FROM contributor_totals ct
        INNER JOIN max_per_file mpf
          ON ct.filePath = mpf.filePath
          AND ct.totalContribCount = mpf.maxContribCount
        GROUP BY ct.filePath
      ),
      ranked_contributors AS (
        SELECT
          ct.filePath,
          ct.contributor,
          ct.totalContribCount,
          tt.topCount,
          ROW_NUMBER() OVER (
            PARTITION BY ct.filePath
            ORDER BY ct.totalContribCount DESC, ct.contributor ASC
          ) AS rank
        FROM contributor_totals ct
        INNER JOIN top_ties tt ON ct.filePath = tt.filePath
      )
      SELECT filePath, contributor, totalContribCount, topCount
      FROM ranked_contributors
      WHERE rank = 1;
    `)

    const result: Record<string, { contributor: string; contribcount: number; hasTie: boolean }> = {}
    res.forEach((row) => {
      const contributor = row["contributor"]
      if (typeof contributor !== "string") {
        throw new Error("Error when getting top contributor per file: Contributor is not a string")
      }
      result[row["filePath"] as string] = {
        contributor: contributor,
        contribcount: Number(row["totalContribCount"]),
        hasTie: Number(row["topCount"]) > 1
      }
    })

    return result
  }

  public async updateCachedResult() {
    // TODO: fix combined_result
    await this.run(`CREATE OR REPLACE TEMP TABLE fileChanges_commits_renamed_cached AS
    SELECT * FROM fileChanges_commits_renamed_files;
    `)
  }

  // private async tableRowCount(table: string) {
  //   return (await this.query(`select count (*) as count from ${table};`))[0]["count"]
  // }

  public async addRenames(renames: RenameEntry[]) {
    await this.usingTableAppender("renames", async (appender) => {
      for (const rename of renames) {
        if (rename.fromName) {
          appender.appendVarchar(rename.fromName)
        } else {
          appender.appendDefault()
        }
        if (rename.toName) {
          appender.appendVarchar(rename.toName)
        } else {
          appender.appendDefault()
        }
        appender.appendUInteger(rename.timestamp)
        appender.appendUInteger(rename.timestampAuthor)
        appender.endRow()
      }
    })
  }

  public async replaceFiles(files: RawGitObject[]) {
    await this.run(`DELETE FROM files;`)
    await this.usingTableAppender("files", async (appender) => {
      for (const file of files) {
        appender.appendVarchar(file.path)
        appender.appendVarchar(file.hash)
        appender.appendVarchar(file.type)
        appender.appendUInteger(file.size ?? 0)
        appender.endRow()
      }
    })
  }

  public async getFiles() {
    const res = await this.query(`FROM files;`)
    return res.map((row) => row["path"] as string)
  }

  public async getObjectType(objectPath: string): Promise<AbstractGitObject["type"] | null> {
    return this.usingPreparedStatement(
      `SELECT type FROM files WHERE path = ?`,
      async (statement) => {
        statement.bindVarchar(1, objectPath)
        const results = (await statement.runAndReadAll()).getRowObjectsJS() as Array<Pick<GitObject, "type">>
        return results[0]?.type ?? null
      },
      "getObjectType"
    )
  }

  public async commitTableEmpty() {
    const res = await this.query(`SELECT * FROM commits LIMIT 1;`)
    return res.length === 0
  }

  public async getLatestCommitHash(beforeTime?: number) {
    const res = await this.query(`SELECT hash FROM commits WHERE committerTime <= ${
      beforeTime ?? 1_000_000_000_000
    } ORDER BY committerTime DESC LIMIT 1;
    `)
    if (res.length < 1)
      throw new Error("Could not get latest commit hash. Commits table is empty. beforeTime set to " + beforeTime)
    return res[0]["hash"] as string
  }

  public async getAuthors() {
    const res = await this.query(`SELECT DISTINCT author, email
      FROM (
        SELECT c.author AS author, c.authorEmail AS email
        FROM commits AS c
        UNION
        SELECT co.name AS author, co.email AS email
        FROM commitTrailers AS co
        WHERE co.trailerType = 'coauthor'
      );
    `)
    return res.map((row) => ({
      name: String(row["author"] ?? ""),
      email: String(row["email"] ?? "")
    }))
  }

  public async getNewestAndOldestChangeDates() {
    const res = await this
      .query(`SELECT MAX(max_time) AS newest, MIN(max_time) AS oldest FROM (SELECT filePath, MAX(committerTime) AS max_time FROM fileChanges_commits_renamed_cached GROUP BY filePath);
    `)
    return { newestChangeDate: res[0]["newest"] as number, oldestChangeDate: res[0]["oldest"] as number }
  }

  public async getCommitCount() {
    const res = await this.query(`SELECT count(distinct commitHash) AS count FROM fileChanges_commits_renamed_cached;
    `)
    return Number(res[0]["count"])
  }

  public async getMaxAndMinCommitCount() {
    const res = await this.query(
      `SELECT MAX(count) as max_commits, MIN(count) as min_commits FROM (SELECT filePath, count(distinct commitHash) AS count FROM fileChanges_commits_renamed_cached GROUP BY filePath ORDER BY count DESC);`
    )
    return { maxCommitCount: Number(res[0]["max_commits"]), minCommitCount: Number(res[0]["min_commits"]) }
  }

  public async getMaxAndMinFileSize() {
    const res = await this.query(
      `SELECT MAX(sizeInBytes) as max_size, MIN(sizeInBytes) as min_size FROM files WHERE type = 'blob';`
    )
    return { maxFileSize: Number(res[0]["max_size"]), minFileSize: Number(res[0]["min_size"]) }
  }

  public async getFileSizePerFile(): Promise<Record<string, number>> {
    const res = await this.query(`SELECT path, sizeInBytes FROM files WHERE type = 'blob';`)

    const result: Record<string, number> = {}
    res.forEach((row) => {
      result[row["path"] as string] = Number(row["sizeInBytes"])
    })

    return result
  }

  public async getLineChangesSumForPath(objectPath: string): Promise<number> {
    const isblob = (await this.getObjectType(objectPath)) === "blob"
    let res: number

    if (isblob) {
      res = await this.usingPreparedStatement(
        `SELECT SUM(insertions + deletions) AS lineChanges FROM fileChanges_commits_renamed_cached WHERE filePath = ?;`,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          const results = (await statement.runAndReadAll()).getRowObjectsJS() as Array<{ lineChanges: number | bigint }>
          return Number(results[0]?.lineChanges ?? 0)
        },
        "getLineChangesSumForPath(blob)"
      )
    } else if (objectPath) {
      res = await this.usingPreparedStatement(
        `SELECT SUM(insertions + deletions) AS lineChanges FROM fileChanges_commits_renamed_cached WHERE filePath LIKE ?;`,
        async (statement) => {
          statement.bindVarchar(1, `${objectPath}/%`)
          const results = (await statement.runAndReadAll()).getRowObjectsJS() as Array<{ lineChanges: number | bigint }>
          return Number(results[0]?.lineChanges ?? 0)
        },
        "getLineChangesSumForPath(tree)"
      )
    } else {
      res = await this.query(
        `SELECT SUM(insertions + deletions) AS lineChanges FROM fileChanges_commits_renamed_cached;`
      ).then((results) => Number(results[0]?.lineChanges ?? 0))
    }
    return res
  }

  public async getContributorDistributionForPath(objectPath: string) {
    const isblob = (await this.getObjectType(objectPath)) === "blob"
    let res: ReturnType<DuckDBResultReader["getRowObjects"]>

    if (isblob) {
      res = await this.usingPreparedStatement(
        `WITH commit_contributors AS (
          SELECT f.filePath, f.commitHash, f.author AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          WHERE f.filePath = ?
          UNION
          SELECT f.filePath, f.commitHash, co.name AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
          WHERE f.filePath = ? AND co.trailerType = 'coauthor' AND co.name <> f.author
        )
        SELECT contributor, SUM(lineChanges) AS totalContribCount
        FROM commit_contributors
        GROUP BY contributor
        ORDER BY totalContribCount DESC, contributor ASC;
       `,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          statement.bindVarchar(2, objectPath)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "getContributorDistributionForPath(blob)"
      )
    } else if (objectPath) {
      res = await this.usingPreparedStatement(
        `WITH commit_contributors AS (
          SELECT f.filePath, f.commitHash, f.author AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          WHERE (f.filePath = ? OR f.filePath LIKE ?)
          UNION
          SELECT f.filePath, f.commitHash, co.name AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
          WHERE (f.filePath = ? OR f.filePath LIKE ?) AND co.trailerType = 'coauthor' AND co.name <> f.author
        )
        SELECT contributor, SUM(lineChanges) AS totalContribCount
        FROM commit_contributors
        GROUP BY contributor
        ORDER BY totalContribCount DESC, contributor ASC;
       `,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          statement.bindVarchar(2, `${objectPath}/%`)
          statement.bindVarchar(3, objectPath)
          statement.bindVarchar(4, `${objectPath}/%`)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "getContributorDistributionForPath(tree)"
      )
    } else {
      res = await this.query(
        `WITH commit_contributors AS (
          SELECT f.filePath, f.commitHash, f.author AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          UNION
          SELECT f.filePath, f.commitHash, co.name AS contributor, (f.insertions + f.deletions) AS lineChanges
          FROM fileChanges_commits_renamed_cached AS f
          INNER JOIN commitTrailers_unioned AS co ON f.commitHash = co.commitHash
          WHERE co.trailerType = 'coauthor' AND co.name <> f.author
        )
        SELECT contributor, SUM(lineChanges) AS totalContribCount
        FROM commit_contributors
        GROUP BY contributor
        ORDER BY totalContribCount DESC, contributor ASC;
       `
      )
    }

    return res.map((row) => {
      return { contributor: row["contributor"] as string, contribs: Number(row["totalContribCount"]) }
    })
  }

  public async pathExistsInSelectedRange(objectPath: string, isBlob: boolean): Promise<boolean> {
    let res: ReturnType<DuckDBResultReader["getRowObjects"]>

    if (isBlob) {
      res = await this.usingPreparedStatement(
        `SELECT EXISTS(
          SELECT 1
          FROM fileChanges_commits_renamed_cached
          WHERE filePath = ?
        ) AS exists_in_range;`,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "pathExistsInSelectedRange(blob)"
      )
    } else if (objectPath) {
      res = await this.usingPreparedStatement(
        `SELECT EXISTS(
          SELECT 1
          FROM fileChanges_commits_renamed_cached
          WHERE filePath = ? OR filePath LIKE ?
        ) AS exists_in_range;`,
        async (statement) => {
          statement.bindVarchar(1, objectPath)
          statement.bindVarchar(2, `${objectPath}/%`)
          return (await statement.runAndReadAll()).getRowObjects()
        },
        "pathExistsInSelectedRange(tree)"
      )
    } else {
      res = await this.query(
        `SELECT EXISTS(SELECT 1 FROM fileChanges_commits_renamed_cached) AS exists_in_range;
      `
      )
    }

    const existsValue = res[0]?.["exists_in_range"]
    return existsValue === true || existsValue === 1 || existsValue === 1n || existsValue === "1"
  }

  private getTimeStringFormat(timerange: [number, number]): [string, "day" | "week" | "month" | "year"] {
    const durationDays = (timerange[1] - timerange[0]) / (60 * 60 * 24)
    if (durationDays < 150) return ["%a %-d %B %Y", "day"]
    if (durationDays < 1000) return ["Week %V %Y", "week"]
    if (durationDays < 4000) return ["%B %Y", "month"]
    return ["%Y", "year"]
  }

  public async getCommitCountPerTime(
    timerange: [number, number]
  ): Promise<[{ date: string; count: number; timestamp: number }[], "day" | "week" | "month" | "year"]> {
    const [query, timeUnit] = this.getTimeStringFormat(timerange)
    const res = await this.query(
      `SELECT strftime(date, '${query}') as timestring,
        count(*) AS count,
        MIN(committerTime) AS ct FROM (SELECT date_trunc('${timeUnit}',
        to_timestamp(committerTime)) AS date,
        committerTime FROM commits)
       GROUP BY date
       ORDER BY date ASC;`
    )
    const mapped = res.map((x) => {
      return { date: x["timestring"] as string, count: Number(x["count"]), timestamp: Number(x["ct"]) }
    })
    const final: { date: string; count: number; timestamp: number }[] = []
    const allIntervals = getTimeIntervals(timeUnit, timerange[0], timerange[1])
    for (const [dateString, timestamp] of allIntervals) {
      const existing = mapped.find((x) => x.date === dateString)
      if (existing) final.push(existing)
      else final.push({ date: dateString, count: 0, timestamp })
    }
    const sorted = final.sort((a, b) => a.timestamp - b.timestamp)
    return [sorted, timeUnit]
  }

  public async updateColorSeed(seed: string) {
    await this.run(`DELETE FROM metadata
       WHERE field = 'colorSeed';
       INSERT INTO metadata (field, intValue, stringValue)
       VALUES ('colorSeed', null, '${seed}');`)
    log.debug("inserted seed", seed)
  }

  public async getGitTruckVersion(): Promise<string | null> {
    const result = await this.query(`SELECT stringValue from metadata WHERE field = 'version';`)

    if (result.length === 0) {
      return null
    }

    return result[0]["stringValue"] as string
  }

  public async getColorSeed() {
    const res = await this.query(`SELECT stringValue FROM metadata WHERE field = 'colorSeed';`)
    if (res.length < 1) return null
    log.debug("retrieved seed", res[0]["stringValue"])
    return res[0]["stringValue"] as string
  }

  public async getLastRunInfo() {
    const res = await this.query(
      `SELECT intValue as time, stringValue as hash FROM metadata WHERE field = 'finished' ORDER BY intValue DESC LIMIT 1;`
    )
    if (!res[0]) return { time: 0, hash: "" }
    return { time: Number(res[0]["time"]), hash: res[0]["hash"] as string }
  }

  public async addCommits(commits: Map<string, GitLogEntry>) {
    await this.usingTableAppender("commits", async (appender) => {
      for (const [hash, commit] of commits) {
        if (!commit) throw new Error(`Commit with hash ${hash} is undefined`)
        appender.appendVarchar(hash)
        appender.appendVarchar(commit.author.name)
        appender.appendVarchar(commit.author.email)
        appender.appendUInteger(commit.committerTime)
        appender.appendUInteger(commit.authorTime)
        appender.endRow()
      }
    })

    await this.usingTableAppender("commitTrailers", async (appender) => {
      for (const [hash, commit] of commits) {
        if (!commit) throw new Error(`Commit with hash ${hash} is undefined`)
        for (const coauthor of commit.coauthors) {
          appender.appendVarchar(hash)
          appender.appendVarchar(coauthor.name)
          appender.appendVarchar(coauthor.email)
          appender.appendVarchar("coauthor")
          appender.endRow()
        }
      }
    })

    await this.usingTableAppender("fileChanges", async (appender) => {
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
