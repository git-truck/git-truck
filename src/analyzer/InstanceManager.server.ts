import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api"
import { existsSync } from "fs"
import { dirname, resolve } from "path"
import { diff } from "semver"
import { log } from "~/analyzer/log.server"
import MetadataDB from "~/analyzer/MetadataDB.server.ts"
import ServerInstance, { type AnalyzationStatus } from "~/analyzer/ServerInstance.server.ts"
import pkg from "../../package.json" with { type: "json" }
import os from "os"
import { GitCaller } from "~/analyzer/git-caller.server"
import DB from "~/analyzer/DB.server"
import fs from "fs/promises"

export default class InstanceManager {
  private static instances: Map<string, Map<string, ServerInstance>> = new Map() // repo -> branch -> instance
  public static metadataDB: MetadataDB

  public static getOrCreateMetadataDB() {
    if (!this.metadataDB) this.metadataDB = new MetadataDB()
    return this.metadataDB
  }

  /**
   * Returns a boolean whether the instance is aborted
   */
  public static getInstanceIsAborted({ repositoryPath, branch }: { repositoryPath: string; branch: string }): boolean {
    const instance = this.instances.get(repositoryPath)?.get(branch)
    return instance ? instance.analyzationStatus === "Aborted" : false
  }

  public static async abortInstance({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    const instance = this.instances.get(repositoryPath)?.get(branch)
    if (instance) {
      const status = instance.abort()
      await this.closeInstance({ repositoryPath, branch })
      
      if (status !== "GeneratingChart") {
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
    analyzationStatus: AnalyzationStatus
    progress: number[]
    totalCommitCount: number
    progressPercentage: number
    progressRevision: number
  } | null {
    const instance = this.instances.get(repositoryPath)?.get(branch)

    if (!instance) {
      return null
    }

    return {
      analyzationStatus: instance.analyzationStatus,
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

  public static async getOrCreateInstance({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<ServerInstance> {
    if (!this.instances) this.instances = new Map()
    const existing = this.instances.get(repositoryPath)?.get(branch)

    if (existing && existing.analyzationStatus !== "Aborted") {
      return existing
    }

    const db = await this.initOrRecreateDatabase({
      repositoryPath,
      branch
    })

    const newInstance = new ServerInstance({
      db,
      gitCaller: new GitCaller({ repositoryPath, branch }),
      repositoryPath,
      branch
    })

    const existingRepo = this.instances.get(repositoryPath)
    if (existingRepo) {
      existingRepo.set(branch, newInstance)
    } else {
      this.instances.set(repositoryPath, new Map([[branch, newInstance]]))
    }

    return newInstance
  }

  public static async closeInstance({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    const instance = this.instances.get(repositoryPath)?.get(branch)
    if (instance) {
      this.instances.get(repositoryPath)?.delete(branch)
      if (this.instances.get(repositoryPath)?.size === 0) {
        this.instances.delete(repositoryPath)
      }
      await instance.db.close()
    }
  }

  public static async closeAllDBInstances() {
    const promises = Array.from(this.instances.values()).flatMap((repoInstance) =>
      Array.from(repoInstance.values()).flatMap((branchInstance) => {
        branchInstance.abort()
        const closePromise = branchInstance.db.close()
        return closePromise
      })
    )
    await Promise.all(promises)
    this.instances = new Map()
  }

  public static getDBPath({ repositoryPath, branch }: { repositoryPath: string; branch: string }): string {
    const repoSanitized = repositoryPath.replace(/\W/g, "_").replace(/\//g, "_").replace(/\//g, "_") + "_"
    const branchSanitized = branch.replace(/\W/g, "_") + "_"
    return resolve(os.tmpdir(), "git-truck-cache", repoSanitized, branchSanitized + ".db")
  }

  public static getRepositoryCachePath({ repositoryPath }: { repositoryPath: string }): string {
    const repoSanitized = repositoryPath.replace(/\W/g, "_").replace(/\//g, "_").replace(/\//g, "_") + "_"
    return resolve(os.tmpdir(), "git-truck-cache", repoSanitized)
  }

  public static async clearAllCaches() {
    const dir = resolve(os.tmpdir(), "git-truck-cache")
    if (!existsSync(dir)) return
    await fs.rm(dir, { recursive: true, force: true })
  }

  public static async clearCache({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    const dbPath = this.getDBPath({ repositoryPath, branch })
    fs.rm(dbPath).catch(() => {})
    fs.rm(dbPath + ".wal")
      .catch(() => {})
      .catch(() => {})
    const parentFolder = this.getRepositoryCachePath({ repositoryPath })
    const files = await fs.readdir(parentFolder).catch(() => [])
    if (files.length === 0) {
      await fs.rmdir(parentFolder).catch(() => {})
    }
  }

  static async initDuckDBInstance({
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

  static async initOrRecreateDatabase({
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

    const db = await new DB({ instance, connection, repositoryPath, branch }).init()

    if (isFreshDB) {
      // Database is fresh, insert version and return
      await this.insertGitTruckVersion(connection)
    }
    return db
  }

  public static async insertGitTruckVersion(connection: DuckDBConnection) {
    // Check if metadata has a git-truck-version already, if so, error
    const result = await (
      await connection.run(`SELECT stringValue FROM metadata WHERE field = 'version';`)
    ).getRowObjects()

    if (result.length > 0) {
      throw new Error("DB has already been populated with version metadata")
    }

    await connection.run(`INSERT INTO metadata (field, stringValue) VALUES ('version', '${pkg.version}');
      `)
  }
}
