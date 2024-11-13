import { log } from "./log"
import ClientInstance from "./ClientInstance.client"

export default class InstanceManager {
  private static instances: Map<string, Map<string, ClientInstance>> = new Map() // repo -> branch -> instance

  public static async getOrCreateInstance(repo: string, branch: string, path: string) {
    log.debug(`Getting instance for ${repo} ${branch}`)
    if (!this.instances) this.instances = new Map()
    const existing = this.instances.get(repo)?.get(branch)
    if (existing) return existing

    const newInstance = await ClientInstance.createInstance(repo, branch, path)
    const existingRepo = this.instances.get(repo)
    if (existingRepo) {
      existingRepo.set(branch, newInstance)
    } else {
      this.instances.set(repo, new Map([[branch, newInstance]]))
    }

    return newInstance
  }

  public static getInstance(repo: string, branch: string) {
    if (!this.instances) this.instances = new Map()
    return this.instances.get(repo)?.get(branch)
  }

  public static async closeAllDBConnections() {
    for (const [, repo] of this.instances) {
      for (const [, branchInstance] of repo) {
        await branchInstance.db.destroy()
      }
    }
    this.instances = new Map()
  }
}
