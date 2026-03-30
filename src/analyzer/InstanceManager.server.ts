import MetadataDB from "~/analyzer/MetadataDB.server.ts"
import ServerInstance from "~/analyzer/ServerInstance.server.ts"

export default class InstanceManager {
  private static instances: Map<string, Map<string, ServerInstance>> = new Map() // repo -> branch -> instance
  public static metadataDB: MetadataDB

  public static getOrCreateMetadataDB() {
    if (!this.metadataDB) this.metadataDB = new MetadataDB()
    return this.metadataDB
  }

  public static getOrCreateInstance({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    if (!this.instances) this.instances = new Map()
    const existing = this.instances.get(repositoryPath)?.get(branch)
    if (existing) return existing

    const newInstance = new ServerInstance({ repositoryPath, branch })
    const existingRepo = this.instances.get(repositoryPath)
    if (existingRepo) {
      existingRepo.set(branch, newInstance)
    } else {
      this.instances.set(repositoryPath, new Map([[branch, newInstance]]))
    }

    return newInstance
  }

  public static getInstance(repositoryPath: string, branch: string) {
    if (!this.instances) this.instances = new Map()
    return this.instances.get(repositoryPath)?.get(branch)
  }

  public static async closeAllDBConnections() {
    const promises = Array.from(this.instances.values()).flatMap((repoInstance) =>
      Array.from(repoInstance.values()).flatMap((branchInstance) => branchInstance.db.close())
    )
    await Promise.all(promises)
    this.instances = new Map()
  }
}
