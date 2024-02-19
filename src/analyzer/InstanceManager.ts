import ServerInstance from "./ServerInstance.server"

export default class InstanceManager {
    private static instances: Map<string, Map<string, ServerInstance>> = new Map() // repo -> branch -> instance
    
    public static getOrCreateInstance(repo: string, branch: string, path: string) {
        if (!this.instances) this.instances = new Map()
        const existing = this.instances.get(repo)?.get(branch)
        if (existing) return existing
    
        const newInstance = new ServerInstance(repo, branch, path)
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
}

