import { log } from "~/server/log"
import { getBaseDirFromPath, getRepoNameFromPath, runProcess } from "~/shared/util.server.ts"
import { promiseHelper, branchCompare, semverCompare } from "~/shared/util.ts"

import { resolve, join } from "node:path"
import { promises as fs, existsSync, readFileSync, statSync } from "node:fs"
import type { GitRefs, Repository } from "~/shared/model.ts"

import os from "node:os"
import { Analysis } from "~/server/Analysis"
import { inflateSync } from "node:zlib"
import { readFile } from "node:fs/promises"

// Scope analysis settings to each command instead of changing repository config.
const logConfigArgs = ["-c", "core.quotepath=false", "-c", "diff.renames=true", "-c", "diff.renameLimit=1000000"]

export type GitLocation =
  | { kind: "repository" | "worktree" | "bare"; gitDir: string; commonDir: string }
  | { kind: "none"; gitDir: null; commonDir: null }

const noGitLocation: GitLocation = { kind: "none", gitDir: null, commonDir: null }

function readTextSync(path: string): string | null {
  try {
    return readFileSync(path, "utf-8")
  } catch {
    return null
  }
}

function isDirectory(path: string) {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false
}

/** Reads `core.bare` from a git config file */
function hasBareConfig(gitDir: string): boolean {
  const config = readTextSync(join(gitDir, "config"))
  if (!config) return false
  let inCore = false
  for (const rawLine of config.split(/\r?\n/)) {
    const line = rawLine.trim()
    const section = line.match(/^\[\s*([^\]\s"]+)/)
    if (section) {
      inCore = section[1].toLowerCase() === "core"
      continue
    }
    const bare = inCore ? line.match(/^bare\s*=\s*(\S+)/i) : null
    if (bare) return ["true", "yes", "on", "1"].includes(bare[1].toLowerCase())
  }
  return false
}

export class GitService {
  private useCache = true
  private catFileCache: Map<string, string> = new Map()

  private repositoryPath: string
  public branch: string

  constructor({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    this.repositoryPath = repositoryPath
    this.branch = branch
  }

  /**
   * Finds the git directories for a folder without spawning git.
   * A worktree has a `.git` file pointing to its own git directory, which shares refs and objects with
   * the common directory. Bare repositories have no working tree and can only be browsed.
   */
  static resolveGitLocation(path: string): GitLocation {
    const dotGit = join(path, ".git")
    const dotGitStat = statSync(dotGit, { throwIfNoEntry: false })

    let gitDir: string
    if (dotGitStat?.isDirectory()) {
      gitDir = dotGit
    } else if (dotGitStat?.isFile()) {
      const target = readTextSync(dotGit)?.match(/^gitdir:\s*(.+?)\s*$/m)?.[1]
      if (!target) return noGitLocation
      gitDir = resolve(path, target)
    } else if (
      existsSync(join(path, "HEAD")) &&
      isDirectory(join(path, "objects")) &&
      isDirectory(join(path, "refs"))
    ) {
      gitDir = path
    } else {
      return noGitLocation
    }

    const commonDirTarget = readTextSync(join(gitDir, "commondir"))?.trim()
    const commonDir = commonDirTarget ? resolve(gitDir, commonDirTarget) : gitDir

    // A worktree's common directory may belong to a bare repository, so only check for bare outside worktrees
    if (commonDir !== gitDir) return { kind: "worktree", gitDir, commonDir }
    if (hasBareConfig(gitDir)) return { kind: "bare", gitDir, commonDir }
    if (gitDir === path) return noGitLocation
    return { kind: "repository", gitDir, commonDir }
  }

  private static requireGitDir(repositoryPath: string) {
    const location = GitService.resolveGitLocation(repositoryPath)
    if (location.kind !== "repository" && location.kind !== "worktree") {
      throw Error(`No git repository exists at ${repositoryPath}`)
    }
    return location
  }

  static async isValidGitRepo(repositoryPath: string): Promise<boolean> {
    const { kind } = GitService.resolveGitLocation(repositoryPath)
    if (kind !== "repository" && kind !== "worktree") return false
    const [, findCommitHashError] = await promiseHelper(
      GitService.getCommitHashOfBranchHead({ repositoryPath: repositoryPath })
    )
    return !findCommitHashError
  }

  static async isValidRevision({ revision, repositoryPath }: { repositoryPath: string; revision: string }) {
    const location = GitService.resolveGitLocation(repositoryPath)
    if (location.kind !== "repository" && location.kind !== "worktree") return false
    const [, findCommitHashError] = await promiseHelper(GitService._revParse(repositoryPath, revision))
    return !findCommitHashError
  }

  static async getCommitHashOfBranchHead({
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

    GitService.requireGitDir(repositoryPath)
    const branchHead = await GitService._revParse(repositoryPath, branch)
    log.debug(`${branch} -> [commit] ${branchHead}`)

    return branchHead
  }
  static getCachePath(repo: string, branch: string) {
    return resolve(os.tmpdir(), "git-truck", repo, `${branch}.json`)
  }

  async getRepositoryHead() {
    return await GitService._getRepositoryHead(this.repositoryPath)
  }

  async gitLogSpecificCommits(commits: string[]) {
    const args = [
      ...logConfigArgs,
      "log",
      "--no-walk",
      "--numstat",
      '--format="parents <|%P|> author <|%aN|> email <|%aE|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"',
      ...commits
    ]

    const result = (await runProcess(this.repositoryPath, "git", args)) as string
    return result.trim()
  }

  static async _getRepositoryHead(dir: string) {
    const { gitDir } = GitService.requireGitDir(dir)
    const [result, error] = await promiseHelper(fs.readFile(join(gitDir, "HEAD"), "utf-8"))
    if (error) {
      throw error
    }
    return result.trim().trim().replace("ref: refs/heads/", "")
  }

  async lsTree(hash: string) {
    return await GitService._lsTree(this.repositoryPath, hash)
  }

  static async _lsTree(repo: string, hash: string) {
    const result = (await runProcess(repo, "git", ["-c", "core.quotepath=false", "ls-tree", "-rlt", hash])) as string
    return result.trim()
  }

  async revParse(ref: string) {
    return await GitService._revParse(this.repositoryPath, ref)
  }

  static async _revParse(dir: string, ref: string) {
    // `--` keeps a ref from being read as a path when a file has the same name
    const result = (await runProcess(dir, "git", ["rev-list", "-n", "1", ref, "--"])) as string
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

    const [currentHead, error] = await promiseHelper(
      GitService.getCommitHashOfBranchHead({ repositoryPath: repositoryPath })
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

    return {
      status: "Success",
      isAnalyzed: false,
      repositoryName: repositoryName,
      repositoryPath: repositoryPath,
      parentDirPath: parentDir,
      parentDirName: getRepoNameFromPath(parentDir),
      currentHead: currentHead,
      refs,
      lastChanged
    }
  }
  public static async getLastChanged(repoPath: string): Promise<number | null> {
    const location = GitService.resolveGitLocation(repoPath)
    if (location.kind !== "repository" && location.kind !== "worktree") return null

    // Fast path: read HEAD file
    const head = await GitService.readFileSafe(join(location.gitDir, "HEAD"))
    if (!head) return null

    const ref: string = head.trim()

    // Detached HEAD? Already a hash
    if (!ref.startsWith("ref:")) {
      const timestamp = GitService.readCommitTimestamp(location.commonDir, ref)
      if (timestamp !== null) return timestamp
    } else {
      // Normal branch; refs are shared with worktrees through the common directory
      const refPath = join(location.commonDir, ref.slice(5).trim())
      const hash = await GitService.readFileSafe(refPath)
      if (hash) {
        const timestamp = GitService.readCommitTimestamp(location.commonDir, hash.trim())
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
  private static readCommitTimestamp(commonDir: string, hash: string): number | null {
    try {
      const objectPath = join(commonDir, "objects", hash.slice(0, 2), hash.slice(2))
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
      ...logConfigArgs,
      "log",
      `--skip=${skip}`,
      `--max-count=${count}`,
      this.branch,
      "--summary",
      "--numstat",
      // "--cc", // include file changes for merge commits
      '--format="parents <|%P|> author <|%aN|> email <|%aE|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"'
    ]

    const result = (await runProcess(this.repositoryPath, "git", args)) as string
    return result.trim()
  }

  async gitLogSimple(skip: number, count: number, instance: Analysis, index: number) {
    const args = [
      ...logConfigArgs,
      "log",
      `--skip=${skip}`,
      `--max-count=${count}`,
      this.branch,
      "--summary",
      "--numstat",
      // "--cc", // include file changes for merge commits
      '--format="<|%P|><|%aN|><|%aE|><|%ct %at|><|%(trailers)|><|%H|>"'
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
}
