import DB from "./DB.server"
import { GitCaller } from "./git-caller.server"
import type {
  GitBlobObject,
  GitTreeObject,
  RawGitObject,
  GitLogEntry,
  FileChange,
  RenameEntry,
  FileModification,
  RenameInterval,
  FullCommitDTO
} from "./model"
import { log } from "./log.server"
import { analyzeRenamedFile } from "./util.server"
import { contribRegex, gitLogRegex, gitLogRegexSimple, modeRegex, treeRegex } from "./constants"
import { cpus } from "os"
import { RepoData } from "~/routes/$repo.$"
import { InvocationReason } from "./RefreshPolicy"
import InstanceManager from "./InstanceManager.server"

export type AnalyzationStatus = "Starting" | "Hydrating" | "GeneratingChart"

export default class ServerInstance {
  public analyzationStatus: AnalyzationStatus = "Starting"
  private repoSanitized: string
  private branchSanitized: string
  public gitCaller: GitCaller
  public db: DB
  public progress = 0
  public totalCommitCount = 0
  private fileTreeAsOf = "HEAD"
  public prevResult: RepoData | null = null
  public prevInvokeReason: InvocationReason = "unknown"
  public prevProgress = { str: "", timestamp: 0 }

  constructor(
    public repo: string,
    public branch: string,
    public path: string
  ) {
    this.repoSanitized = repo.replace(/\W/g, "_")
    this.branchSanitized = branch.replace(/\W/g, "_")
    this.gitCaller = new GitCaller(repo, branch, path)
    this.db = new DB(repo, branch)
  }

  public updateProgress() {
    this.progress++
  }

  public async updateTimeInterval(start: number, end: number) {
    await this.db.updateTimeInterval(start, end)
    this.fileTreeAsOf = await this.db.getLatestCommitHash(end)
  }

  // TODO: handle breadcrumb when timeseries changes such that
  // currently zoomed folder no longer exists
  public async analyzeTree() {
    const rawContent = await this.gitCaller.lsTree(this.fileTreeAsOf)
    const lsTreeEntries: RawGitObject[] = []
    const matches = rawContent.matchAll(treeRegex)
    let fileCount = 0

    for (const match of matches) {
      if (!match.groups) continue

      const groups = match.groups
      lsTreeEntries.push({
        type: groups["type"] as "blob" | "tree",
        hash: groups["hash"],
        size: groups["size"] === "-" ? undefined : Number(groups["size"]),
        path: this.repo + "/" + groups["path"]
      })
    }

    const rootTree = {
      type: "tree",
      path: this.repo,
      name: this.repo,
      hash: this.fileTreeAsOf,
      children: []
    } as GitTreeObject

    await this.db.replaceFiles(lsTreeEntries)

    for (const child of lsTreeEntries) {
      const prevTrees = child.path.split("/").slice(1)
      const newName = prevTrees.pop() as string
      const newPath = `${child.path}`
      let currTree = rootTree
      for (const treePath of prevTrees) {
        const foundTree = currTree.children.find((t) => t.name === treePath && t.type === "tree")
        if (!foundTree) continue
        currTree = foundTree as GitTreeObject
      }
      switch (child.type) {
        case "tree": {
          const newTree: GitTreeObject = {
            type: "tree",
            path: newPath,
            name: newName,
            hash: child.hash,
            children: []
          }

          currTree.children.push(newTree)

          break
        }
        case "blob": {
          fileCount += 1
          const blob: GitBlobObject = {
            type: "blob",
            hash: child.hash,
            path: newPath,
            name: newName,
            sizeInBytes: child.size as number
          }
          currTree.children.push(blob)
          break
        }
      }
    }

    this.treeCleanup(rootTree)
    return { rootTree, fileCount }
  }

  private treeCleanup(tree: GitTreeObject) {
    for (const child of tree.children) {
      if (child.type === "tree") {
        const ctree = child as GitTreeObject
        this.treeCleanup(ctree)
      }
    }
    tree.children = tree.children.filter((child) => {
      if (child.type === "blob") return true
      else {
        const ctree = child as GitTreeObject
        if (ctree.children.length === 0) return false
        return true
      }
    })
    if (tree.children.length === 1 && tree.children[0].type === "tree") {
      const temp = tree.children[0]
      tree.children = temp.children
      tree.name = `${tree.name}/${temp.name}`
      tree.path = `${tree.path}/${temp.name}`
    }
  }

  public async gatherCommitsFromGitLog(
    gitLogResult: string,
    commits: Map<string, GitLogEntry>,
    renamedFiles: RenameEntry[]
  ) {
    const matches = gitLogResult.matchAll(gitLogRegexSimple)
    const FileModifications: FileModification[] = []
    for (const match of matches) {
      const groups = match.groups ?? {}
      const author = groups.author
      const committertime = Number(groups.datecommitter)
      const authortime = Number(groups.dateauthor)
      const hash = groups.hash
      const contributionsString = groups.contributions
      const modesString = groups.modes
      const fileChanges: FileChange[] = []

      if (modesString) {
        const modeMatches = modesString.matchAll(modeRegex)
        for (const modeMatch of modeMatches) {
          const file = modeMatch.groups?.file.trim()
          const mode = modeMatch.groups?.mode.trim()
          if (!file || !mode) continue
          if (mode === "delete" || mode === "create") {
            FileModifications.push({ path: file, timestamp: committertime, timestampauthor: authortime, type: mode })
          }
        }
      }

      if (contributionsString) {
        const contribMatches = contributionsString.matchAll(contribRegex)
        for (const contribMatch of contribMatches) {
          const file = contribMatch.groups?.file.trim()
          const isBinary = contribMatch.groups?.insertions === "-"
          if (!file) throw Error("file not found")

          const fileHasMoved = file.includes("=>")
          let filePath = file
          if (fileHasMoved) {
            filePath = analyzeRenamedFile(file, committertime, authortime, renamedFiles, this.repo)
          }

          const insertions = isBinary ? 1 : Number(contribMatch.groups?.insertions ?? "0")
          const deletions = isBinary ? 0 : Number(contribMatch.groups?.deletions ?? "0")
          fileChanges.push({ isBinary, insertions, deletions, path: this.repo + "/" + filePath, mode: "modify" }) // TODO remove modetype
        }
      }
      commits.set(hash, { author, committertime, authortime, hash, coauthors: [], fileChanges })
    }

    renamedFiles.push(
      ...FileModifications.map((modification) => {
        if (modification.type === "delete") {
          return {
            fromname: modification.path,
            toname: null,
            timestamp: modification.timestamp,
            timestampauthor: modification.timestampauthor
          }
        }
        return {
          fromname: null,
          toname: modification.path,
          timestamp: modification.timestamp,
          timestampauthor: modification.timestampauthor
        }
      })
    )
  }

  public async getFullCommits(gitLogResult: string) {
    const commits: FullCommitDTO[] = []
    const matches = gitLogResult.matchAll(gitLogRegex)
    for (const match of matches) {
      const groups = match.groups ?? {}
      const author = groups.author
      const message = groups.message
      const body = groups.body
      const committertime = Number(groups.datecommitter)
      const authortime = Number(groups.dateauthor)
      const hash = groups.hash
      const contributionsString = groups.contributions
      const fileChanges: FileChange[] = []

      if (contributionsString) {
        const contribMatches = contributionsString.matchAll(contribRegex)
        for (const contribMatch of contribMatches) {
          const file = contribMatch.groups?.file.trim()
          const isBinary = contribMatch.groups?.insertions === "-"
          if (!file) throw Error("file not found")

          const insertions = isBinary ? 1 : Number(contribMatch.groups?.insertions ?? "0")
          const deletions = isBinary ? 0 : Number(contribMatch.groups?.deletions ?? "0")
          fileChanges.push({ isBinary, insertions, deletions, path: file, mode: "modify" })
        }
      }
      commits.push({ author, committertime, authortime, hash, fileChanges, message, body })
    }
    return commits
  }

  private async gatherCommitsInRange(
    start: number,
    end: number,
    commits: Map<string, GitLogEntry>,
    renamedFiles: RenameEntry[]
  ) {
    const gitLogResult = await this.gitCaller.gitLogSimple(start, end - start, this)
    await this.gatherCommitsFromGitLog(gitLogResult, commits, renamedFiles)
    log.debug("done gathering")
  }

  private flattenChains(chains: RenameInterval[][]) {
    return chains.flatMap((chain) => {
      const destinationName = chain[0].toname
      return chain.map((interval) => ({ ...interval, toname: destinationName }) as RenameInterval)
    })
  }

  public async updateRenames() {
    const rawRenames = await this.db.getCurrentRenameIntervals()
    const files = await this.db.getFiles()
    const renameChains = this.generateRenameChains(rawRenames, files)
    const flattenedRenames = this.flattenChains(renameChains)
    await this.db.replaceTemporaryRenames(flattenedRenames)
  }

  private generateRenameChains(orderedRenames: RenameInterval[], currentFiles: string[]) {
    const currentPathToRenameChain = new Map<string, RenameInterval[]>()
    const finishedChains: RenameInterval[][] = []

    for (const file of currentFiles)
      currentPathToRenameChain.set(file, [{ fromname: file, toname: file, timestamp: 0, timestampend: 4_000_000_000 }])

    for (const rename of orderedRenames) {
      // if file was deleted, we not care about what it was previously called
      if (rename.toname === null) continue
      const existing = currentPathToRenameChain.get(rename.toname)
      if (existing) {
        const prevRename = existing[existing.length - 1]
        prevRename.timestamp = rename.timestampend
        rename.timestampend = prevRename.timestamp
        if (rename.fromname !== null) {
          // add rename to chain, and set the current rename to the newly found rename
          existing.push(rename)
          currentPathToRenameChain.set(rename.fromname, existing)
        } else {
          // if we found the time of file creation, we do not need to follow renames for it any more
          prevRename.timestamp = rename.timestampend
          finishedChains.push(existing)
        }
        currentPathToRenameChain.delete(rename.toname)
      }
    }

    finishedChains.push(...currentPathToRenameChain.values())
    return finishedChains
  }

  public async loadRepoData() {
    this.analyzationStatus = "Starting"

    let commitCount = await this.gitCaller.getCommitCount()
    if (await InstanceManager.metadataDB.getLastRun(this.repo, this.branch)) {
      const latestCommit = await this.db.getLatestCommitHash()
      commitCount = await this.gitCaller.commitCountSinceCommit(latestCommit)
      log.info(`Repo has been analyzed previously, only analzying ${commitCount} commits`)
    }

    if (commitCount < 1) return
    const quotePathDefaultValue = await this.gitCaller.getDefaultGitSettingValue("core.quotepath")
    await this.gitCaller.setGitSetting("core.quotePath", "off")
    const renamesDefaultValue = await this.gitCaller.getDefaultGitSettingValue("diff.renames")
    await this.gitCaller.setGitSetting("diff.renames", "true")
    const renameLimitDefaultValue = await this.gitCaller.getDefaultGitSettingValue("diff.renameLimit")
    await this.gitCaller.setGitSetting("diff.renameLimit", "1000000")

    this.totalCommitCount = commitCount
    // const threadCount = Math.min(cpus().length > 4 ? 4 : 2, commitCount)
    const threadCount = 2
    // Dynamically set commitBundleSize, such that progress indicator is smoother for small repos
    const commitBundleSize = Math.ceil(Math.min(Math.max(commitCount / 4, 10_000), 150_000))
    this.analyzationStatus = "Hydrating"
    // Sync threads every commitBundleSize commits to reset commits map, to reduce peak memory usage
    for (let index = 0; index < commitCount; index += commitBundleSize) {
      this.progress = index
      const runCountCommit = Math.min(commitBundleSize, commitCount - index)
      const sectionSize = Math.ceil(runCountCommit / threadCount)

      const commits = new Map<string, GitLogEntry>()
      const renamedFiles: RenameEntry[] = []

      const promises = Array.from({ length: threadCount }, (_, i) => {
        const sectionStart = index + i * sectionSize
        let sectionEnd = Math.min(sectionStart + sectionSize, index + runCountCommit)
        if (sectionEnd > commitCount) sectionEnd = runCountCommit
        log.info("start thread " + sectionStart + "-" + sectionEnd)
        return this.gatherCommitsInRange(sectionStart, sectionEnd, commits, renamedFiles)
      })

      await Promise.all(promises)
      await this.db.addRenames(renamedFiles)
      await this.db.addCommits(commits)
      log.debug("done adding")

      log.info("threads synced")
    }
    await this.db.createIndexes()
    await this.db.checkpoint()
    await this.gitCaller.resetGitSetting("core.quotepath", quotePathDefaultValue)
    await this.gitCaller.resetGitSetting("diff.renames", renamesDefaultValue)
    await this.gitCaller.resetGitSetting("diff.renameLimit", renameLimitDefaultValue)

    await InstanceManager.metadataDB.setCompletion(this.repo, this.branch, await this.db.getLatestCommitHash())
    this.analyzationStatus = "GeneratingChart"
  }
}
