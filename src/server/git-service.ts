import { log } from "~/server/log"
import { getBaseDirFromPath, getRepoNameFromPath, runProcess } from "~/shared/util.server.ts"
import { promiseHelper, branchCompare, semverCompare } from "~/shared/util.ts"

import { resolve, join } from "node:path"
import { promises as fs, existsSync, readFileSync } from "node:fs"
import type { GitRefs, Repository } from "~/shared/model.ts"

import os from "node:os"
import { Analysis } from "~/server/Analysis"
import { inflateSync } from "node:zlib"
import { readFile } from "node:fs/promises"

export class GitService {
  private useCache = true
  private catFileCache: Map<string, string> = new Map()

  private repositoryPath: string
  public branch: string

  constructor({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    this.repositoryPath = repositoryPath
    this.branch = branch
  }

  static hasGitDirectory(path: string): boolean {
    const gitFolderPath = resolve(path, ".git")
    return existsSync(gitFolderPath)
  }

  static async isValidGitRepo(path: string): Promise<boolean> {
    const hasGitFolder = this.hasGitDirectory(path)
    if (!hasGitFolder) return false
    const [, findBranchHeadError] = await promiseHelper(GitService.findBranchHead({ repositoryPath: path }))
    return Boolean(hasGitFolder && !findBranchHeadError)
  }

  static async isValidRevision(revision: string, path: string) {
    const gitFolder = join(path, ".git")
    const [, findBranchHeadError] = await promiseHelper(GitService._revParse(gitFolder, revision))
    return !findBranchHeadError
  }

  static async findBranchHead({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch?: string
  }): Promise<string> {
    if (!branch) {
      const [foundBranch, getBranchError] = await promiseHelper(GitService._getRepositoryHead(repositoryPath))
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

    const branchHead = await GitService._revParse(gitFolder, branch)
    log.debug(`${branch} -> [commit] ${branchHead}`)

    return branch
  }
  static getCachePath(repo: string, branch: string) {
    return resolve(os.tmpdir(), "git-truck", repo, `${branch}.json`)
  }

  async getRepositoryHead() {
    return await GitService._getRepositoryHead(this.repositoryPath)
  }

  async gitLogSpecificCommits(commits: string[]) {
    const args = [
      "log",
      "--no-walk",
      "--numstat",
      '--format="author <|%aN|> email <|%aE|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"',
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
    return await GitService._lsTree(this.repositoryPath, hash)
  }

  static async _lsTree(repo: string, hash: string) {
    const result = (await runProcess(repo, "git", ["ls-tree", "-rlt", hash])) as string
    return result.trim()
  }

  async revParse(ref: string) {
    return await GitService._revParse(this.repositoryPath, ref)
  }

  static async _revParse(dir: string, ref: string) {
    const result = (await runProcess(dir, "git", ["rev-list", "-n", "1", ref])) as string
    return result.trim()
  }
  static async getRepoMetadata(repositoryPath: string): Promise<Repository | null> {
    const repositoryName = getRepoNameFromPath(repositoryPath)
    const parentDir = getBaseDirFromPath(repositoryPath)
    const lastChanged = await GitService.getLastChanged(repositoryPath)

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

    const refs = GitService.parseRefs(await GitService._getRefs(repositoryPath))

    const [branch, error] = await promiseHelper(GitService.findBranchHead({ repositoryPath: repositoryPath }))
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

    return {
      status: "Success",
      isAnalyzed: false,
      repositoryName: repositoryName,
      repositoryPath: repositoryPath,
      parentDirPath: parentDir,
      parentDirName: getRepoNameFromPath(parentDir),
      currentHead: branch,
      refs,
      lastChanged
    }
  }
  public static async getLastChanged(repoPath: string): Promise<number | null> {
    // Fast path: read HEAD file
    const head = await GitService.readFileSafe(join(repoPath, ".git", "HEAD"))
    if (!head) return null

    const ref: string = head.trim()

    // Detached HEAD? Already a hash
    if (!ref.startsWith("ref:")) {
      const timestamp = GitService.readCommitTimestamp(repoPath, ref)
      if (timestamp !== null) return timestamp
    } else {
      // Normal branch
      const refPath = join(repoPath, ".git", ref.slice(5).trim())
      const hash = await GitService.readFileSafe(refPath)
      if (hash) {
        const timestamp = GitService.readCommitTimestamp(repoPath, hash.trim())
        if (timestamp !== null) return timestamp
      }
    }

    // Fallback: spawn Git
    const [output] = await promiseHelper(runProcess(repoPath, "git", ["log", "-1", "--pretty=%at"]))
    if (!output) return null

    const parsed = parseInt(output.trim())
    return isNaN(parsed) ? null : parsed
  }

  /** Safely read a file, used with promiseHelper */
  private static async readFileSafe(path: string): Promise<string | null> {
    const [result] = await promiseHelper(readFile(path, "utf-8"))
    return result
  }

  /** Reads a loose commit object and returns its author timestamp */
  private static readCommitTimestamp(repoPath: string, hash: string): number | null {
    try {
      const objectPath = join(repoPath, ".git", "objects", hash.slice(0, 2), hash.slice(2))
      if (!existsSync(objectPath)) return null

      const compressed: Buffer = readFileSync(objectPath)
      const content: string = inflateSync(compressed).toString("utf-8")

      const match: RegExpMatchArray | null = content.match(/^author .*? (\d+) [+-]\d{4}$/m)
      if (!match) return null

      return Number(match[1])
    } catch {
      return null
    }
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
      '--format="author <|%aN|> email <|%aE|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"'
    ]

    const result = (await runProcess(this.repositoryPath, "git", args)) as string
    return result.trim()
  }

  async gitLogSimple(skip: number, count: number, instance: Analysis, index: number) {
    const args = [
      "log",
      `--skip=${skip}`,
      `--max-count=${count}`,
      this.branch,
      "--summary",
      "--numstat",
      // "--cc", // include file changes for merge commits
      '--format="<|%aN|><|%aE|><|%ct %at|><|%(trailers)|><|%H|>"'
    ]

    const result = (await runProcess(this.repositoryPath, "git", args, instance, index)) as string
    return result.trim()
  }

  setUseCache(useCache: boolean) {
    this.useCache = useCache
  }

  public async commitCountSinceCommit(hash: string, branch: string): Promise<number> {
    const result = Number(await runProcess(this.repositoryPath, "git", ["rev-list", "--count", `${hash}..${branch}`]))
    return isNaN(result) ? 0 : result
  }

  async getRefs(): Promise<string> {
    return await GitService._getRefs(this.repositoryPath)
  }

  static async _getRefs(repo: string): Promise<string> {
    const result = await runProcess(repo, "git", ["show-ref"])
    return result as string
  }

  private async catFile(hash: string) {
    const result = await runProcess(this.repositoryPath, "git", ["cat-file", "-p", hash])
    return result as string
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
