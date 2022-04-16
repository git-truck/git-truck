import { log } from "./log.server"
import { getBaseDirFromPath, getDirName, promiseHelper, runProcess } from "./util.server"
import { resolve, join } from "path"
import { promises as fs, existsSync } from "fs"
import { AnalyzerData, AnalyzerDataInterfaceVersion, Repository } from "./model"

export enum ANALYZER_CACHE_MISS_REASONS {
  OTHER_REPO = "The cache was not created for this repo",
  NOT_CACHED = "No cache was found",
  BRANCH_HEAD_CHANGED = "Branch head changed",
  DATA_VERSION_MISMATCH = "Outdated cache",
}

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

  static async isGitRepo(path: string): Promise<boolean> {
    const gitFolderPath = resolve(path, ".git")
    const hasGitFolder = existsSync(gitFolderPath)
    if (!hasGitFolder) return false
    const [, findBranchHeadError] = await promiseHelper(GitCaller.findBranchHead(path))
    return Boolean(hasGitFolder && !findBranchHeadError)
  }

  /**
   *
   * @param repo The repo to find the branch head for
   * @param branch The branch to find the head for (default: checkout branch)
   * @returns Promise<[branchHead: string, branchName: string]>
   */
  static async findBranchHead(repo: string, branch?: string): Promise<[string, string]> {
    if (!branch) {
      const [foundBranch, getBranchError] = await promiseHelper(GitCaller.getCurrentBranch(repo))
      if (getBranchError) {
        throw getBranchError
      }
      branch = foundBranch
    }

    const gitFolder = join(repo, ".git")
    if (!existsSync(gitFolder)) {
      throw Error("No git folder exists at " + gitFolder)
    }
    // Find file containing the branch head
    const branchPath = join(gitFolder, "refs/heads/" + branch)
    const absolutePath = join(process.cwd(), branchPath)
    log.debug("Looking for branch head at " + absolutePath)

    const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
    log.debug(`${branch} -> [commit]${branchHead}`)
    if (!branchHead) throw Error("Branch head not found")

    return [branchHead, branch]
  }

  static getCachePath(repo: string, branch: string) {
    return resolve(__dirname, "..", ".temp", repo, `${branch}.json`)
  }

  static async getCurrentBranch(dir: string) {
    const result = (await runProcess(dir, "git", ["rev-parse", "--abbrev-ref", "HEAD"])) as string
    return result.trim()
  }

  static async scanDirectoryForRepositories(argPath: string): Promise<[Repository | null, Repository[]]> {
    let userRepo: Repository | null = null
    const pathIsRepo = await GitCaller.isGitRepo(argPath)
    const baseDir = resolve(pathIsRepo ? getBaseDirFromPath(argPath) : argPath)

    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    const dirs = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name)
    const repoOrNull = await Promise.all(
      dirs.map(async (repoDir) => {
        const repoPath = join(baseDir, repoDir)
        const [isRepo] = await promiseHelper(GitCaller.isGitRepo(repoPath))
        if (!isRepo) return null
        const repo: Repository = { name: repoDir, path: repoPath, data: null, reasons: [] }
        try {
          const [findBranchHeadResult, error] = await promiseHelper(GitCaller.findBranchHead(repoPath))
          if (!error) {
            const [branchHead, branch] = findBranchHeadResult
            const [data, reasons] = await GitCaller.retrieveCachedResult({
              repo: repoDir,
              branch,
              branchHead,
            })
            repo.data = data
            repo.reasons = reasons
          }
        } catch (e) {
          return null
        }
        return repo
      })
    )
    const onlyRepos: Repository[] = repoOrNull.filter((currentRepo) => {
      if (currentRepo === null) return false
      if (pathIsRepo && currentRepo.name === getDirName(argPath)) {
        userRepo = currentRepo
      }
      return true
    }) as Repository[]

    return [userRepo, onlyRepos]
  }

  static async retrieveCachedResult({
    repo,
    branch,
    branchHead,
  }: {
    repo: string
    branch: string
    branchHead: string
  }): Promise<[AnalyzerData | null, ANALYZER_CACHE_MISS_REASONS[]]> {
    const reasons = []
    const cachedDataPath = GitCaller.getCachePath(repo, branch)
    if (!existsSync(cachedDataPath)) return [null, [ANALYZER_CACHE_MISS_REASONS.NOT_CACHED]]

    const cachedData = JSON.parse(await fs.readFile(cachedDataPath, "utf8")) as AnalyzerData

    // Check if the current branchHead matches the hash of the analyzed commit from the cache
    const branchHeadMatches = branchHead === cachedData.commit.hash
    if (!branchHeadMatches) reasons.push(ANALYZER_CACHE_MISS_REASONS.BRANCH_HEAD_CHANGED)

    // Check if the data uses the most recent analyzer data interface
    const dataVersionMatches = cachedData.interfaceVersion === AnalyzerDataInterfaceVersion
    if (!branchHeadMatches) reasons.push(ANALYZER_CACHE_MISS_REASONS.DATA_VERSION_MISMATCH)

    // Check if the selected repository has changed
    const repoMatches = repo === cachedData.repo

    const cacheConditions = {
      branchHeadMatches,
      dataVersionMatches,
      repoMatches,
    }

    // Only return cached data if every criteria is met
    if (!Object.values(cacheConditions).every(Boolean)) return [null, reasons]

    return [cachedData, reasons]
  }

  private constructor(repo: string) {
    this.repo = repo
  }

  setUseCache(useCache: boolean) {
    this.useCache = useCache
  }

  async getRefs() {
    const result = await runProcess(this.repo, "git", ["show-ref"])
    return result as string
  }

  private async catFile(hash: string) {
    const result = await runProcess(this.repo, "git", ["cat-file", "-p", hash])
    return result as string
  }

  async findBranchHead(branch?: string) {
    return await GitCaller.findBranchHead(this.repo, branch)
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
    try {
      const result = await runProcess(this.repo, "git", ["blame", path])
      return result as string
    } catch (e) {
      log.warn(`Could not blame on ${path}. It might have been deleted since last commit.`)
      return ""
    }
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

  async hasUnstagedChanges() {
    const result = await runProcess(this.repo, "git", ["update-index", "--refresh"])
    return !!result
  }

  async parseBlame(path: string) {
    const cutString = path.slice(path.indexOf("/") + 1)
    const blame = await this.blameCached(cutString)
    const blameRegex = /\((?<author>.*?)\s+\d{4}-\d{2}-\d{2}/gm
    const matches = blame.match(blameRegex)
    const blameAuthors: Record<string, number> = {}
    matches?.forEach((match) => {
      const author = match
        .slice(1)
        .slice(0, match.length - 11)
        .trim()
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
    const result = await runProcess(this.repo, "git", ["diff", "--numstat", a, b])
    return result as string
  }

  async getDefaultGitSettingValue(setting: string) {
    const result = await runProcess(this.repo, "git", ["config", setting])
    return result as string
  }

  async resetGitSetting(settingToReset: string, value: string) {
    if (!value) {
      await runProcess(this.repo, "git", ["config", "--unset", settingToReset])
      log.debug(`Unset ${settingToReset}`)
    } else {
      await runProcess(this.repo, "git", ["config", settingToReset, value])
      log.debug(`Reset ${settingToReset} to ${value}`)
    }
  }

  async setGitSetting(setting: string, value: string) {
    await runProcess(this.repo, "git", ["config", setting, value])
    log.debug(`Set ${setting} to ${value}`)
  }
}
