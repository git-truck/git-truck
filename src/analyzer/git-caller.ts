import { runProcess } from "./util"

export type RawGitObjectType = "blob" | "tree" | "commit" | "tag"
export type RawGitObject = {
  hash: string
  type: RawGitObjectType
  idk: string
  value: string
}

export class GitCaller {
  private useCache = true
  private repo: string
  private catFileCache: Map<string, string> = new Map()
  private diffNumStatCache: Map<string, string> = new Map()

  private static instance: GitCaller | null = null

  static initInstance(repo: string) {
    if (!GitCaller.instance || GitCaller.instance.repo !== repo) {
      GitCaller.instance = new GitCaller(repo)
    }
  }

  static destroyInstance() {
    GitCaller.instance = null
  }

  static getInstance(): GitCaller {
    if (!GitCaller.instance) {
      throw Error("ObjectDeflator not initialized")
    }
    return GitCaller.instance
  }

  private constructor(repo: string) {
    this.repo = repo
  }

  setUseCache(useCache: boolean) {
    this.useCache = useCache
  }

  async catFileCached(hash: string): Promise<string> {
    if (!this.useCache) {
      const cachedValue = this.catFileCache.get(hash)
      if (cachedValue) {
        return cachedValue
      }
    }
    const result = await this.catFile(hash)
    this.catFileCache.set(hash, result)

    return result
  }

  async gitDiffNumStatCached(a: string, b: string) {
    const key = a + b
    if (this.useCache) {
      const cachedValue = this.diffNumStatCache.get(key)
      if (cachedValue) {
        return cachedValue
      }
    }
    const result = await this.gitDiffNumStat(a, b)
    this.diffNumStatCache.set(key, result)
    return result
  }

  private async catFile(hash: string) {
    const result = await runProcess(this.repo, "git", ["cat-file", "-p", hash])
    return result as string
  }

  private async gitDiffNumStat(a: string, b: string) {
    const result = await runProcess(this.repo, "git", [
      "diff",
      "--numstat",
      a,
      b,
    ])
    return result as string
  }
}
