import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api"
import { existsSync } from "fs"
import { dirname, resolve } from "path"
import { diff } from "semver"
import { log } from "~/server/log"
import MetadataDB from "~/server/MetadataDB"
import { Analysis, type AnalysisStatus } from "~/server/Analysis"
import pkg from "../../package.json" with { type: "json" }
import os from "os"
import { GitService } from "~/server/git-service"
import DB from "~/server/DB"
import fs from "fs/promises"
import { DisposableMutex } from "~/server/DisposableMutex"
import { createHash } from "crypto"

export class AnalysisManager {
  private static instancesSingleton: Map<string, Map<string, Analysis>> = new Map() // repo -> branch -> instance
  private static mutex = new DisposableMutex()

  /**
   * Returns a boolean whether the instance is aborted
   */
  public static getInstanceIsAborted({ repositoryPath, branch }: { repositoryPath: string; branch: string }): boolean {
    const instance = this.instancesSingleton.get(repositoryPath)?.get(branch)
    return instance ? instance.status === "Aborted" : false
  }

  public static async abortInstance({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    using _ = await this.mutex.withDisposable()
    const instance = this.instancesSingleton.get(repositoryPath)?.get(branch)
    if (instance) {
      const status = instance.abort()
      await this.closeInstance({ repositoryPath, branch })

      if (status !== "CommitHistoryProcessed") {
        await this.clearCache({
          repositoryPath,
          branch
        })
      }
      return true
    }
    return false
  }

  /**
   * Gets the progress of a ServerInstance for a given repository path and branch, or null if it doesn't exist
   */
  public static getInstanceProgress({ repositoryPath, branch }: { repositoryPath: string; branch: string }): {
    status: AnalysisStatus
    progress: number[]
    totalCommitCount: number
    progressPercentage: number
    progressRevision: number
  } | null {
    const instance = this.instancesSingleton.get(repositoryPath)?.get(branch)

    if (!instance) {
      return null
    }

    return {
      status: instance.status,
      totalCommitCount: instance.totalCommitCount,
      progress: instance.progress,
      progressPercentage: this.calculateProgressPercentage(instance.progress, instance.totalCommitCount),
      progressRevision: instance.progressRevision
    }
  }

  private static calculateProgressPercentage(progress: number[], totalCommitCount: number): number {
    return totalCommitCount > 0
      ? Math.min((progress.reduce((acc, curr) => acc + curr, 0) / totalCommitCount) * 100, 100)
      : 0
  }

  public static async getInstance({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<Analysis> {
    using _ = await this.mutex.withDisposable()
    return await this.getOrCreateInstanceUnlocked({ repositoryPath, branch })
  }

  private static async getOrCreateInstanceUnlocked({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<Analysis> {
    if (!this.instancesSingleton) this.instancesSingleton = new Map()
    const existing = this.instancesSingleton.get(repositoryPath)?.get(branch)

    if (existing && existing.status !== "Aborted") {
      return existing
    }

    const db = await this.initOrRecreateDatabase({
      repositoryPath,
      branch
    })

    const newInstance = new Analysis({
      db,
      gitService: new GitService({ repositoryPath, branch }),
      repositoryPath,
      branch
    })

    const existingRepo = this.instancesSingleton.get(repositoryPath)
    if (existingRepo) {
      existingRepo.set(branch, newInstance)
    } else {
      this.instancesSingleton.set(repositoryPath, new Map([[branch, newInstance]]))
    }

    return newInstance
  }

  public static async closeInstance({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    const instance = this.instancesSingleton.get(repositoryPath)?.get(branch)
    if (instance) {
      this.instancesSingleton.get(repositoryPath)?.delete(branch)
      if (this.instancesSingleton.get(repositoryPath)?.size === 0) {
        this.instancesSingleton.delete(repositoryPath)
      }
      await instance.db.close()
    }
  }

  public static async clearAllCaches() {
    using _ = await this.mutex.withDisposable()
    await this.closeAllDBInstancesUnlocked()
    await this.clearAllCachesUnlocked()
    await MetadataDB.resetInstance()
  }

  public static async closeAllDBInstances() {
    using _ = await this.mutex.withDisposable()
    await this.closeAllDBInstancesUnlocked()
  }

  private static async closeAllDBInstancesUnlocked() {
    const promises = Array.from(this.instancesSingleton.values()).flatMap((repoInstance) =>
      Array.from(repoInstance.values()).flatMap((branchInstance) => {
        branchInstance.abort()
        return branchInstance.db.close()
      })
    )
    await Promise.all(promises)
    this.instancesSingleton = new Map()
  }

  private static getDBPath({ repositoryPath, branch }: { repositoryPath: string; branch: string }): string {
    const repoHash = this.getFilesystemKey(repositoryPath)
    const branchHash = this.getFilesystemKey(branch)
    return resolve(os.tmpdir(), "git-truck-cache", repoHash, `${branchHash}.db`)
  }

  private static getRepositoryCachePath({ repositoryPath }: { repositoryPath: string }): string {
    const repoHash = this.getFilesystemKey(repositoryPath)
    return resolve(os.tmpdir(), "git-truck-cache", repoHash)
  }

  private static getFilesystemKey(value: string): string {
    return createHash("sha256").update(value).digest("hex")
  }

  private static async clearAllCachesUnlocked() {
    const dir = resolve(os.tmpdir(), "git-truck-cache")
    if (!existsSync(dir)) return
    await fs.rm(dir, { recursive: true, force: true })
  }

  private static async clearCache({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    const dbPath = this.getDBPath({ repositoryPath, branch })
    await Promise.allSettled([fs.rm(dbPath, { force: true }), fs.rm(`${dbPath}.wal`, { force: true })])
    const parentFolder = this.getRepositoryCachePath({ repositoryPath })
    const files = await fs.readdir(parentFolder).catch(() => [])
    if (files.length === 0) {
      await fs.rmdir(parentFolder).catch(() => {})
    }
  }

  private static async initDuckDBInstance({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<DuckDBInstance> {
    const dbPath = this.getDBPath({ repositoryPath, branch })
    const dir = dirname(dbPath)

    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true })
    return await DuckDBInstance.create(dbPath, { temp_directory: dir })
  }

  private static async initOrRecreateDatabase({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<DB> {
    const dbPath = this.getDBPath({ repositoryPath, branch })
    let instance = await this.initDuckDBInstance({ repositoryPath, branch })
    let connection = await instance.connect()

    // Check if tables already exist, if so, expect a version number in the metadata table and check if it is compatible
    const initialTables = (await connection.runAndReadAll(`SHOW TABLES`)).getRowObjects()
    let isFreshDB = initialTables.length === 0

    const metadataExists = initialTables.some((table) => table.name === "metadata")

    // Check if metadata has a git-truck-version already, if so, error
    const versionResult: string | null = metadataExists
      ? ((await connection.runAndReadAll(`SELECT stringValue FROM metadata WHERE field = 'version';`).catch(() => {}))
          ?.getRowObjects()[0]
          ?.stringValue?.toString() ?? null)
      : null

    if (versionResult) {
      log.debug(`Found existing database with git-truck version ${versionResult}`)
    }

    const databaseIsStale = versionResult ? diff(versionResult, pkg.version) === "major" : true

    if (initialTables.length > 0 && databaseIsStale) {
      log.warn(`Database at path ${dbPath} is stale (db: ${versionResult}, installed: ${pkg.version}), resetting...`)

      await this.closeInstance({ repositoryPath, branch })
      connection.closeSync()
      instance.closeSync()
      await this.clearCache({
        repositoryPath,
        branch
      })
      instance = await this.initDuckDBInstance({ repositoryPath, branch })
      connection = await instance.connect()

      log.info("Database reset complete. Verifying...")

      const tables = (await connection.runAndReadAll(`SHOW TABLES`)).getRowObjects()

      if (tables.length > 0) {
        throw new Error(`Failed to clear stale database, tables still exist after clearing: ${JSON.stringify(tables)}`)
      } else {
        log.info("Done clearing stale database!")
        isFreshDB = true
      }
    } else {
      log.info(`Database at path ${dbPath} is up to date`)
    }

    const db = await new DB({ instance, connection }).init()

    if (isFreshDB) {
      // Database is fresh, insert version and return
      await this.insertGitTruckVersion(connection)
    }
    return db
  }

  private static async insertGitTruckVersion(connection: DuckDBConnection) {
    // Check if metadata has a git-truck-version already, if so, error
    const result = await (
      await connection.run(`SELECT stringValue FROM metadata WHERE field = 'version';`)
    ).getRowObjects()

    if (result.length > 0) {
      throw new Error("DB has already been populated with version metadata")
    }

    await connection.run(`INSERT INTO metadata (field, stringValue) VALUES ('version', '${pkg.version}');`)
  }
}
