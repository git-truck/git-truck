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
  private blameCache: Map<string, string> = new Map()

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

  private async catFile(hash: string) {
    const result = await runProcess(this.repo, "git", ["cat-file", "-p", hash])
    return result as string
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

  private async blame(path: string) {
    const result = await runProcess(this.repo, "git", ["blame", path])
    return result as string
  }

  async blameCached(path: string): Promise<string> {
    if (!this.useCache) {
      const cachedValue = this.blameCache.get(path)
      if (cachedValue) {
        return cachedValue
      }
    }
    const result = await this.blame(path)
    this.blameCache.set(path, result)

    return result
  }

  async parseBlame(path: string) {
    const cutString = path.slice(path.indexOf("/") + 1)
    const blame = await this.blameCached(cutString)
    const blameRegex = /\((?<author>.*?)\s+\d{4}-\d{2}-\d{2}/gm
    const matches = blame.match(blameRegex)
    const blameAuthors: Record<string, number> = {}
    matches?.forEach(match => {
      const author = match.slice(1).slice(0, match.length - 11).trim()
      if (author !== "Not Committed Yet") {
        const currentValue = blameAuthors[author] ?? 0
        blameAuthors[author] = currentValue + 1
      }
    })
    return blameAuthors
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
