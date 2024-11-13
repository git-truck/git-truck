import { log } from "./log"
import { branchCompare, semverCompare } from "~/util"
import type { GitRefs } from "./model"

import { runGitFromClient } from "~/routes/git"

export enum ANALYZER_CACHE_MISS_REASONS {
  OTHER_REPO = "The cache was not created for this repo",
  NOT_CACHED = "No cache was found",
  BRANCH_HEAD_CHANGED = "Branch head changed",
  DATA_VERSION_MISMATCH = "Outdated cache"
}

export class GitCaller {
  private useCache = true
  private catFileCache: Map<string, string> = new Map()

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private repo: string,
    public branch: string,
    private path: string
  ) {}

  async getRepositoryHead() {
    return await GitCaller._getRepositoryHead(this.repo)
  }

  async gitLogSpecificCommits(commits: string[]) {
    const args = [
      "log",
      "--no-walk",
      "--numstat",
      '--format="author <|%aN|> date <|%ct %at|> message <|%s|> body <|%b|> hash <|%H|>"',
      ...commits
    ]

    const result = (await runGitFromClient(this.path, args)) as string
    return result.trim()
  }

  static async _getRepositoryHead(dir: string) {
    const result = (await runGitFromClient(dir, ["rev-parse", "--abbrev-ref", "HEAD"])) as string
    return result.trim()
  }

  async lsTree(hash: string) {
    return await GitCaller._lsTree(this.path, hash)
  }

  static async _lsTree(repo: string, hash: string) {
    const result = (await runGitFromClient(repo, ["ls-tree", "-rlt", hash])) as string
    return result.trim()
  }

  async revParse(ref: string) {
    return await GitCaller._revParse(this.path, ref)
  }

  static async _revParse(dir: string, ref: string) {
    const result = (await runGitFromClient(dir, ["rev-list", "-n", "1", ref])) as string
    return result.trim()
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

    const result = (await runGitFromClient(this.path, args)) as string
    return result.trim()
  }

  async gitLogSimple(skip: number, count: number) {
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

    const result = (await runGitFromClient(this.path, args)) as string
    return result.trim()
  }

  setUseCache(useCache: boolean) {
    this.useCache = useCache
  }

  public async commitCountSinceCommit(hash: string, branch: string) {
    const result = Number(await runGitFromClient(this.path, ["rev-list", "--count", `${hash}..${branch}`])) as number
    return result
  }

  async getRefs() {
    return await GitCaller._getRefs(this.repo)
  }

  static async _getRefs(repo: string) {
    const result = await runGitFromClient(repo, ["show-ref"])
    return result as string
  }

  private async catFile(hash: string) {
    const result = await runGitFromClient(this.path, ["cat-file", "-p", hash])
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

  async getCommitCount() {
    return Number(await runGitFromClient(this.path, ["rev-list", "--count", this.branch]))
  }

  async getDefaultGitSettingValue(setting: string) {
    const result = await runGitFromClient(this.path, ["config", setting])
    return result as string
  }

  async resetGitSetting(settingToReset: string, value: string) {
    if (!value) {
      // await runGitFromClient(this.path, ["config", "--unset", settingToReset])
      log.debug(`Unset ${settingToReset}`)
    } else {
      // await runGitFromClient(this.path, ["config", settingToReset, value])
      log.debug(`Reset ${settingToReset} to ${value}`)
    }
  }

  async setGitSetting(setting: string, value: string) {
    // await runGitFromClient(this.path, ["config", setting, value])
    log.debug(`Set ${setting} to ${value}`)
  }
}
