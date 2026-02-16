import { log } from "./log.server.ts"
import { getBaseDirFromPath, getRepoNameFromPath, runProcess } from "../shared/util.server.ts"
import { promiseHelper, branchCompare, semverCompare } from "../shared/util.ts"

import { resolve, join } from "node:path"
import { promises as fs, existsSync } from "node:fs"
import type { AnalyzerData, GitRefs, Repository } from "../shared/model.ts"
import { AnalyzerDataInterfaceVersion } from "../shared/model.ts"

import os from "node:os"
import ServerInstance from "./ServerInstance.server.ts"

const ANALYZER_CACHE_MISS_REASONS = {
  OTHER_REPO: "The cache was not created for this repo",
  NOT_CACHED: "No cache was found",
  BRANCH_HEAD_CHANGED: "Branch head changed",
  DATA_VERSION_MISMATCH: "Outdated cache"
}

export type ANALYZER_CACHE_MISS_REASONS = (typeof ANALYZER_CACHE_MISS_REASONS)[keyof typeof ANALYZER_CACHE_MISS_REASONS]

export class GitCaller {
  private useCache = true
  private catFileCache: Map<string, string> = new Map()

  private repositoryPath: string
  public branch: string

  constructor({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    this.repositoryPath = repositoryPath
    this.branch = branch
  }

  static async isGitRepo(path: string): Promise<boolean> {
    const gitFolderPath = resolve(path, ".git")
    const hasGitFolder = existsSync(gitFolderPath)
    if (!hasGitFolder) return false
    const [, findBranchHeadError] = await promiseHelper(GitCaller.findBranchHead({ repositoryPath: path }))
    return Boolean(hasGitFolder && !findBranchHeadError)
  }

  static async isValidRevision(revision: string, path: string) {
    const gitFolder = join(path, ".git")
    const [, findBranchHeadError] = await promiseHelper(GitCaller._revParse(gitFolder, revision))
    return !findBranchHeadError
  }

  /**
   *
   * @param repositoryPath The repository path to find the branch head for
   * @param branch The branch to find the head for (default: checkout branch)
   * @returns Promise<[branchHead: string, branchName: string]>
   */
  static async findBranchHead({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch?: string
  }): Promise<[string, string]> {
    if (!branch) {
      const [foundBranch, getBranchError] = await promiseHelper(GitCaller._getRepositoryHead(repositoryPath))
      if (getBranchError) {
        throw getBranchError
      }
      branch = foundBranch
    }

    const gitFolder = join(repositoryPath, ".git")
    if (!existsSync(gitFolder)) {
      throw Error("No git folder exists at " + gitFolder)
    }
    // Find file containing the branch head

    const branchHead = await GitCaller._revParse(gitFolder, branch)
    log.debug(`${branch} -> [commit] ${branchHead}`)

    return [branchHead, branch]
  }
  static getCachePath(repo: string, branch: string) {
    return resolve(os.tmpdir(), "git-truck", repo, `${branch}.json`)
  }

  async getRepositoryHead() {
    return await GitCaller._getRepositoryHead(this.repositoryPath)
  }

  async gitLogSpecificCommits(commits: string[]) {
    const args = [
      "log",
      "--no-walk",
      "--numstat",
      '--format="author <|%aN|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"',
      ...commits
    ]

    const result = (await runProcess(this.repositoryPath, "git", args)) as string
    return result.trim()
  }

  static async _getRepositoryHead(dir: string) {
    const [result, error] = await promiseHelper(fs.readFile(join(dir, ".git", "HEAD"), "utf-8"))
    if (error) {
      throw error
    }
    return result.trim().trim().replace("ref: refs/heads/", "")
  }

  async lsTree(hash: string) {
    return await GitCaller._lsTree(this.repositoryPath, hash)
  }

  static async _lsTree(repo: string, hash: string) {
    const result = (await runProcess(repo, "git", ["ls-tree", "-rlt", hash])) as string
    return result.trim()
  }

  async revParse(ref: string) {
    return await GitCaller._revParse(this.repositoryPath, ref)
  }

  static async _revParse(dir: string, ref: string) {
    const result = (await runProcess(dir, "git", ["rev-list", "-n", "1", ref])) as string
    return result.trim()
  }
  static async getRepoMetadata(repositoryPath: string): Promise<Repository | null> {
    const repositoryName = getRepoNameFromPath(repositoryPath)
    const parentDir = getBaseDirFromPath(repositoryPath)
    const lastChanged = await GitCaller.getLastChanged(repositoryPath)

    if (!lastChanged) {
      return {
        status: "Error",
        // errorMessage: "Not a git repository",   // TODO: Implement browsing, requires new routing
        errorMessage: "Not a valid git repository",
        repositoryName,
        repositoryPath,
        parentDirPath: parentDir,
        parentDirName: getRepoNameFromPath(parentDir),
        lastChanged: 0
      }
    }

    const refs = GitCaller.parseRefs(await GitCaller._getRefs(repositoryPath))
    const allHeads = new Set([...Object.entries(refs.Branches), ...Object.entries(refs.Tags)]).values()
    const headsWithCaches = await Promise.all(
      Array.from(allHeads).map(async ([headName, head]) => {
        const [result] = await GitCaller.retrieveCachedResult({
          repositoryPath: getRepoNameFromPath(repositoryPath),
          branch: headName,
          branchHead: head
        })
        return {
          headName,
          head,
          isAnalyzed: result !== null
        }
      })
    )
    const analyzedHeads = headsWithCaches
      .filter((head) => head.isAnalyzed)
      .reduce(
        (acc, headEntry) => ({ ...acc, [headEntry.head]: true, [headEntry.headName]: true }),
        {} as { [branch: string]: boolean }
      )

    const repoHead = await GitCaller._getRepositoryHead(repositoryPath)

    try {
      const [findBranchHeadResult, error] = await promiseHelper(
        GitCaller.findBranchHead({ repositoryPath: repositoryPath })
      )
      if (error) {
        return {
          status: "Error",
          errorMessage: error.message,
          repositoryName: repositoryName,
          repositoryPath: repositoryPath,
          parentDirPath: parentDir,
          parentDirName: getRepoNameFromPath(parentDir),
          lastChanged
        }
      }

      const [branchHead, branch] = findBranchHeadResult
      const [data, reasons] = await GitCaller.retrieveCachedResult({
        repositoryPath: repositoryName,
        branch,
        branchHead
      })

      if (!data) {
        return {
          status: "Success",
          isAnalyzed: false,
          data: null,
          reasons: reasons,
          repositoryName: repositoryName,
          repositoryPath: repositoryPath,
          parentDirPath: parentDir,
          parentDirName: getRepoNameFromPath(parentDir),
          currentHead: branch,
          refs,
          analyzedHeads,
          lastChanged
        }
      }

      return {
        status: "Success",
        isAnalyzed: true,
        data: data,
        reasons: [],
        repositoryName: repositoryName,
        repositoryPath: repositoryPath,
        parentDirPath: parentDir,
        parentDirName: getRepoNameFromPath(parentDir),
        currentHead: repoHead,
        refs,
        analyzedHeads,
        lastChanged
      }
    } catch (e) {
      return {
        status: "Error",
        errorMessage: e instanceof Error ? e.message : "Unknown error",
        repositoryName: repositoryName,
        repositoryPath: repositoryPath,
        parentDirPath: parentDir,
        parentDirName: getRepoNameFromPath(parentDir),
        lastChanged
      }
    }
  }

  public static async getLastChanged(path: string): Promise<number | null> {
    const [logOutput, error] = await promiseHelper(runProcess(path, "git", ["log", "-1", "--pretty=%at"]))
    if (error || !logOutput) {
      return null
    }

    const parsed = parseInt(logOutput as string, 10)
    if (isNaN(parsed)) {
      return null
    }

    return parsed
  }

  static parseRefs(refsAsMultilineString: string): GitRefs {
    const gitRefs: GitRefs = {
      Branches: {},
      Tags: {}
    }

    const regex = /^(?<hash>.*) refs\/(?<ref_type>.*?)\/(?<path>.*)$/gm

    const matches = refsAsMultilineString.matchAll(regex)
    let next = matches.next()

    while (next.value) {
      const groups = next.value.groups
      if (!groups) break
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

  async gitLog(skip: number, count: number) {
    const args = [
      "log",
      `--skip=${skip}`,
      `--max-count=${count}`,
      this.branch,
      "--summary",
      "--numstat",
      // "--cc", // include file changes for merge commits
      '--format="author <|%aN|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"'
    ]

    const result = (await runProcess(this.repositoryPath, "git", args)) as string
    return result.trim()
  }

  async gitLogSimple(skip: number, count: number, instance: ServerInstance, index: number) {
    const args = [
      "log",
      `--skip=${skip}`,
      `--max-count=${count}`,
      this.branch,
      "--summary",
      "--numstat",
      // "--cc", // include file changes for merge commits
      '--format="<|%aN|><|%ct %at|><|%H|>"'
    ]

    const result = (await runProcess(this.repositoryPath, "git", args, instance, index)) as string
    return result.trim()
  }

  static async retrieveCachedResult({
    repositoryPath,
    branch,
    branchHead
  }: {
    repositoryPath: string
    branch: string
    branchHead: string
  }): Promise<[AnalyzerData | null, ANALYZER_CACHE_MISS_REASONS[]]> {
    const reasons = []
    const cachedDataPath = GitCaller.getCachePath(repositoryPath, branch)
    if (!existsSync(cachedDataPath)) return [null, [ANALYZER_CACHE_MISS_REASONS.NOT_CACHED]]

    const cachedData = JSON.parse(await fs.readFile(cachedDataPath, "utf8")) as AnalyzerData

    // Check if the current branchHead matches the hash of the analyzed commit from the cache
    const branchHeadMatches = branchHead === cachedData.commit.hash
    if (!branchHeadMatches) reasons.push(ANALYZER_CACHE_MISS_REASONS.BRANCH_HEAD_CHANGED)

    // Check if the data uses the most recent analyzer data interface
    const dataVersionMatches = cachedData.interfaceVersion === AnalyzerDataInterfaceVersion
    if (!branchHeadMatches) reasons.push(ANALYZER_CACHE_MISS_REASONS.DATA_VERSION_MISMATCH)

    // Check if the selected repository has changed
    const repoMatches = repositoryPath === cachedData.repositoryPath

    const cacheConditions = {
      branchHeadMatches,
      dataVersionMatches,
      repoMatches
    }

    // Only return cached data if every criteria is met
    if (!Object.values(cacheConditions).every(Boolean)) return [null, reasons]

    return [cachedData, reasons]
  }

  setUseCache(useCache: boolean) {
    this.useCache = useCache
  }

  public async commitCountSinceCommit(hash: string, branch: string): Promise<number> {
    const result = Number(await runProcess(this.repositoryPath, "git", ["rev-list", "--count", `${hash}..${branch}`]))
    return isNaN(result) ? 0 : result
  }

  async getRefs(): Promise<string> {
    return await GitCaller._getRefs(this.repositoryPath)
  }

  static async _getRefs(repo: string): Promise<string> {
    const result = await runProcess(repo, "git", ["show-ref"])
    return result as string
  }

  private async catFile(hash: string) {
    const result = await runProcess(this.repositoryPath, "git", ["cat-file", "-p", hash])
    return result as string
  }

  async findBranchHead() {
    return await GitCaller.findBranchHead({ repositoryPath: this.repositoryPath, branch: this.branch })
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

  async getCommitCount(): Promise<number> {
    const result = await runProcess(this.repositoryPath, "git", ["rev-list", "--count", this.branch])
    return Number(result)
  }

  async getDefaultGitSettingValue(setting: string) {
    const result = await runProcess(this.repositoryPath, "git", ["config", setting])
    return result as string
  }

  async resetGitSetting(settingToReset: string, value: string) {
    if (!value) {
      await runProcess(this.repositoryPath, "git", ["config", "--unset", settingToReset])
      log.debug(`Unset ${settingToReset}`)
    } else {
      await runProcess(this.repositoryPath, "git", ["config", settingToReset, value])
      log.debug(`Reset ${settingToReset} to ${value}`)
    }
  }

  async setGitSetting(setting: string, value: string) {
    await runProcess(this.repositoryPath, "git", ["config", setting, value])
    log.debug(`Set ${setting} to ${value}`)
  }
}
