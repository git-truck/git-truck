import DB from "./DB"
import { GitCaller } from "./git-caller.server"
import type {
  GitBlobObject,
  GitTreeObject,
  RawGitObject,
  GitLogEntry,
  FileChange,
  RenameEntry,
  FileModification
} from "./model"
import { log } from "./log.server"
import { analyzeRenamedFile } from "./util.server"
import { getCoAuthors } from "./coauthors.server"
import { contribRegex, gitLogRegex, modeRegex, treeRegex } from "./constants"
import { cpus } from "os"

export type AnalyzationStatus = "Starting" | "Hydrating" | "GeneratingChart" | "Idle"

export default class ServerInstance {
  public analyzationStatus: AnalyzationStatus = "Idle"
  private repoSanitized: string
  private branchSanitized: string
  public gitCaller: GitCaller
  public db: DB
  public progress = 0
  public totalCommitCount = 0
  private fileTreeAsOf = "HEAD"

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
        path: groups["path"]
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
      log.debug(`Path: ${child.path}`)
      const prevTrees = child.path.split("/")
      const newName = prevTrees.pop() as string
      const newPath = `${this.repo}/${child.path}`
      let currTree = rootTree
      for (const treePath of prevTrees) {
        currTree = currTree.children.find((t) => t.name === treePath && t.type === "tree") as GitTreeObject
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

  public async gatherCommitsFromGitLog(gitLogResult: string, commits: Map<string, GitLogEntry>) {
    const renamedFiles: RenameEntry[] = []
    const matches = gitLogResult.matchAll(gitLogRegex)
    const FileModifications: FileModification[] = []
    for (const match of matches) {
      const groups = match.groups ?? {}
      const author = groups.author
      const committertime = Number(groups.datecommitter)
      const authortime = Number(groups.dateauthor)
      const body = groups.body
      const message = groups.message
      const hash = groups.hash
      const contributionsString = groups.contributions
      const modesString = groups.modes
      const coauthors = body ? getCoAuthors(body) : []
      const fileChanges: FileChange[] = []

      if (modesString) {
        const modeMatches = modesString.matchAll(modeRegex)
        for (const modeMatch of modeMatches) {
          const file = modeMatch.groups?.file.trim()
          const mode = modeMatch.groups?.mode.trim()
          if (!file || !mode) continue
          if (mode === "delete" || mode === "create") {
            FileModifications.push({ path: file, timestamp: committertime, type: mode })
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
            filePath = analyzeRenamedFile(file, committertime, renamedFiles)
          }

          const contribs = isBinary
            ? 1
            : Number(contribMatch.groups?.insertions ?? "0") + Number(contribMatch.groups?.deletions ?? "0")
          fileChanges.push({ isBinary, contribs, path: filePath, mode: "modify" }) // TODO remove modetype
        }
      }
      commits.set(hash, { author, committertime, authortime, body, message, hash, coauthors, fileChanges })
    }

    renamedFiles.push(
      ...FileModifications.map((modification) => {
        if (modification.type === "delete") {
          return { fromname: modification.path, toname: null, originalToName: null, timestamp: modification.timestamp }
        }
        return {
          fromname: null,
          toname: modification.path,
          originalToName: modification.path,
          timestamp: modification.timestamp
        }
      })
    )

    await this.db.addRenames(renamedFiles)
  }

  private async gatherCommitsInRange(start: number, end: number, commits: Map<string, GitLogEntry>) {
    const gitLogResult = await this.gitCaller.gitLog(start, end - start)
    await this.gatherCommitsFromGitLog(gitLogResult, commits)
    log.debug("done gathering")
  }

  public async loadRepoData() {
    
    let commitCount = await this.gitCaller.getCommitCount()
    if (await this.db.hasCompletedPreviously()) {
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
    if (commitCount > 500_000)
      log.warn(
        "This repo has a lot of commits, so nodejs might run out of memory. Consider setting the environment variable NODE_OPTIONS to --max-old-space-size=4096 and rerun Git Truck"
      )
    this.analyzationStatus = "Hydrating"
    // Sync threads every commitBundleSize commits to reset commits map, to reduce peak memory usage
    for (let index = 0; index < commitCount; index += commitBundleSize) {
      this.progress = index
      const runCountCommit = Math.min(commitBundleSize, commitCount - index)
      const sectionSize = Math.ceil(runCountCommit / threadCount)

      const commits = new Map<string, GitLogEntry>()

      const promises = Array.from({ length: threadCount }, (_, i) => {
        const sectionStart = index + i * sectionSize
        let sectionEnd = Math.min(sectionStart + sectionSize, index + runCountCommit)
        if (sectionEnd > commitCount) sectionEnd = runCountCommit
        log.info("start thread " + sectionStart + "-" + sectionEnd)
        return this.gatherCommitsInRange(sectionStart, sectionEnd, commits)
      })

      await Promise.all(promises)

      await this.db.addCommits(commits)
      log.debug("done adding")

      log.info("threads synced")
    }
    await this.db.createIndexes()
    await this.gitCaller.resetGitSetting("core.quotepath", quotePathDefaultValue)
    await this.gitCaller.resetGitSetting("diff.renames", renamesDefaultValue)
    await this.gitCaller.resetGitSetting("diff.renameLimit", renameLimitDefaultValue)

    await this.db.setFinishTime()
  }
}
