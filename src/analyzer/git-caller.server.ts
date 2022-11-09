import { log } from "./log.server"
import { describeAsyncJob, getBaseDirFromPath, getDirName, promiseHelper, runProcess } from "./util.server"
import { resolve, join } from "path"
import { promises as fs, existsSync } from "fs"
import type { AnalyzerData, GitRefs, Repository } from "./model"
import { AnalyzerDataInterfaceVersion } from "./model"
import { branchCompare, semverCompare } from "~/components/util"
import os from "os"

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
  public branch?: string
  private catFileCache: Map<string, string> = new Map()
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
      const [foundBranch, getBranchError] = await promiseHelper(GitCaller._getRepositoryHead(repo))
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

    const branchHead = await GitCaller._revParse(gitFolder, branch)
    log.debug(`${branch} -> [commit]${branchHead}`)

    return [branchHead, branch]
  }

  static getCachePath(repo: string, branch: string) {
    return resolve(os.tmpdir(), "git-truck", repo, `${branch}.json`)
  }

  async getRepositoryHead() {
    return await GitCaller._getRepositoryHead(this.repo)
  }

  static async _getRepositoryHead(dir: string) {
    const result = (await runProcess(dir, "git", ["rev-parse", "--abbrev-ref", "HEAD"])) as string
    return result.trim()
  }

  async lsTree(hash: string) {
    return await GitCaller._lsTree(this.repo, hash)
  }

  static async _lsTree(repo: string, hash: string) {
    const result = (await runProcess(repo, "git", ["ls-tree", "-rlt", hash])) as string
    return result.trim()
  }

  async revParse(ref: string) {
    return await GitCaller._revParse(this.repo, ref)
  }

  static async _revParse(dir: string, ref: string) {
    const result = (await runProcess(dir, "git", ["rev-list", "-n", "1", ref])) as string
    return result.trim()
  }

  static async getRepoMetadata(repoPath: string): Promise<Repository | null> {
    const repoDir = getDirName(repoPath)
    const [isRepo] = await promiseHelper(GitCaller.isGitRepo(repoPath))
    if (!isRepo) return null
    const refs = GitCaller.parseRefs(await GitCaller._getRefs(repoPath))
    const allHeads = new Set([...Object.entries(refs.Branches), ...Object.entries(refs.Tags)]).values()
    const headsWithCaches = await Promise.all(
      Array.from(allHeads).map(async ([headName, head]) => {
        const [result] = await GitCaller.retrieveCachedResult({
          repo: getDirName(repoPath),
          branch: headName,
          branchHead: head,
        })
        return {
          headName,
          head,
          isAnalyzed: result !== null,
        }
      })
    )
    const analyzedHeads = headsWithCaches
      .filter((head) => head.isAnalyzed)
      .reduce(
        (acc, headEntry) => ({ ...acc, [headEntry.head]: true, [headEntry.headName]: true }),
        {} as { [branch: string]: boolean }
      )

    const repo: Repository = {
      name: repoDir,
      path: repoPath,
      data: null,
      reasons: [],
      currentHead: await GitCaller._getRepositoryHead(repoPath),
      refs,
      analyzedHeads,
    }

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
  }

  static async scanDirectoryForRepositories(argPath: string): Promise<[Repository | null, Repository[]]> {
    let userRepo: Repository | null = null
    const [pathIsRepo] = await describeAsyncJob(
      () => GitCaller.isGitRepo(argPath),
      "Checking if path is a git repo...",
      "Done checking if path is a git repo",
      "Error checking if path is a git repo"
    )

    const baseDir = resolve(pathIsRepo ? getBaseDirFromPath(argPath) : argPath)

    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    const dirs = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name)

    const [repoOrNull, repoOrNullError] = await describeAsyncJob(
      () => Promise.all(dirs.map((repo) => GitCaller.getRepoMetadata(join(baseDir, repo)))),
      "Scanning for repositories...",
      "Done scanning for repositories",
      "Error scanning for repositories"
    )

    if (repoOrNullError) {
      throw repoOrNullError
    }

    const onlyRepos: Repository[] = repoOrNull.filter((currentRepo) => {
      if (currentRepo === null) return false
      if (pathIsRepo && currentRepo.name === getDirName(argPath)) {
        userRepo = currentRepo
      }
      return true
    }) as Repository[]

    return [userRepo, onlyRepos]
  }

  static parseRefs(refsAsMultilineString: string): GitRefs {
    const gitRefs: GitRefs = {
      Branches: {},
      Tags: {},
    }

    const regex = /^(?<hash>.*) refs\/(?<ref_type>.*?)\/(?<path>.*)$/gm

    const matches = refsAsMultilineString.matchAll(regex)
    let next = matches.next()

    while (next.value) {
      const groups = next.value.groups
      next = matches.next()
      const hash: string = groups["hash"]
      const ref_type: string = groups["ref_type"]
      const path: string = groups["path"]

      switch (ref_type) {
        case "heads":
          gitRefs.Branches[path] = hash
          break
        case "remotes":
          break
        case "tags":
          gitRefs.Tags[path] = hash
          break
        default:
          break
      }
    }

    gitRefs.Branches = Object.fromEntries(Object.entries(gitRefs.Branches).sort(([a], [b]) => branchCompare(a, b)))

    gitRefs.Tags = Object.fromEntries(Object.entries(gitRefs.Tags).sort(([a], [b]) => semverCompare(a, b) * -1))

    return gitRefs
  }

  async gitLog(filePath?: string) {
    if (!this.branch) throw Error("branch not set")
    const args = [
      "log",
      this.branch,
      "--stat=1000000",
      "--stat-graph-width=1",
      '--format="author <|%an|> date <|%at|> message <|%s|> body <|%b|> hash <|%H|>"',
    ]

    if (filePath) {
      args.push("--follow")
      args.push(filePath)
    }

    const result = (await runProcess(this.repo, "git", args)) as string
    return result.trim()
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
    return await GitCaller._getRefs(this.repo)
  }

  static async _getRefs(repo: string) {
    const result = await runProcess(repo, "git", ["show-ref"])
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
    if (this.useCache) {
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
    if (!this.branch) throw Error("Branch is undefined")
    try {
      const result = await runProcess(this.repo, "git", ["blame", this.branch, "--", path])
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
