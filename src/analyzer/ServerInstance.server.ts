import DB from "~/analyzer/DB.server.ts"
import { getCoAuthors } from "~/analyzer/coauthors.server.ts"
import { GitCaller } from "~/analyzer/git-caller.server.ts"
import type {
  GitBlobObject,
  GitTreeObject,
  RawGitObject,
  GitLogEntry,
  FileChange,
  RenameEntry,
  FileModification,
  RenameInterval,
  FullCommitDTO,
  RepoData
} from "~/shared/model.ts"
import { log } from "~/analyzer/log.server.ts"
import { analyzeRenamedFile, promiseHelper } from "~/shared/util.ts"
import { contribRegex, gitLogRegex, gitLogRegexSimple, modeRegex, treeRegex } from "~/shared/constants.ts"
import { cpus, freemem, totalmem } from "node:os"

import type { InvocationReason } from "~/shared/RefreshPolicy.ts"
import InstanceManager from "~/analyzer/InstanceManager.server.ts"
import { getRepoNameFromPath } from "~/shared/util.server.ts"

export type AnalyzationStatus = "Starting" | "Hydrating" | "GeneratingChart"

export default class ServerInstance {
  public analyzationStatus: AnalyzationStatus = "Starting"
  public gitCaller: GitCaller
  public db: DB
  public progress = [0]
  public totalCommitCount = 0
  private fileTreeAsOf: string | null = null
  public prevResult: RepoData | null = null
  public prevInvokeReason: InvocationReason = "unknown"
  public prevProgress = { str: "", timestamp: 0 }

  public repositoryPath: string
  public repositoryName: string
  public branch: string
  constructor({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    this.repositoryPath = repositoryPath
    this.repositoryName = getRepoNameFromPath(repositoryPath)
    this.branch = branch
    this.gitCaller = new GitCaller({ repositoryPath, branch })
    this.db = new DB({ repositoryPath, branch })
  }

  public updateProgress(index: number) {
    this.progress[index]++
  }

  private async gathererWorker(sectionStart: number, sectionEnd: number, index: number) {
    const CHUNK_SIZE = 70_000

    for (let start = sectionStart; start <= sectionEnd; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, sectionEnd)
      const commits = new Map<string, GitLogEntry>()
      const renamedFiles: RenameEntry[] = []
      log.debug(`thread ${index} gathering ${start}-${end}`)
      await this.gatherCommitsInRange(start, end, commits, renamedFiles, index)
      await this.db.addRenames(renamedFiles)
      await this.db.addCommits(commits)
      this.progress[index] = end - sectionStart
    }
  }

  public async updateTimeInterval(start: number, end: number) {
    await this.db.updateTimeInterval(start, end)
    this.fileTreeAsOf = await this.db.getLatestCommitHash(end)
  }

  // TODO: handle breadcrumb when timeseries changes such that
  // currently zoomed folder no longer exists
  public async analyzeTree() {
    if (!this.fileTreeAsOf) this.fileTreeAsOf = await this.db.getLatestCommitHash()
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
        path: this.repositoryName + "/" + groups["path"]
      })
    }

    const rootTree = {
      type: "tree",
      path: this.repositoryName,
      name: this.repositoryName,
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
            extension: newName.substring(newName.lastIndexOf(".") + 1),
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
      const contributorName = groups.author
      const authorEmail = groups.authorEmail
      const committerTime = Number(groups.dateCommitter)
      const authorTime = Number(groups.dateAuthor)
      const hash = groups.hash
      const contributionsString = groups.contributions
      const modesString = groups.modes
      const coauthors = getCoAuthors(groups.trailers)
      const fileChanges: FileChange[] = []

      if (modesString) {
        const modeMatches = modesString.matchAll(modeRegex)
        for (const modeMatch of modeMatches) {
          const file = modeMatch.groups?.file.trim()
          const mode = modeMatch.groups?.mode.trim()
          if (!file || !mode) continue
          if (mode === "delete" || mode === "create") {
            FileModifications.push({ path: file, timestamp: committerTime, timestampAuthor: authorTime, type: mode })
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
            filePath = analyzeRenamedFile(file, committerTime, authorTime, renamedFiles, this.repositoryName)
          }

          const insertions = isBinary ? 1 : Number(contribMatch.groups?.insertions ?? "0")
          const deletions = isBinary ? 0 : Number(contribMatch.groups?.deletions ?? "0")
          fileChanges.push({
            isBinary,
            insertions,
            deletions,
            path: this.repositoryName + "/" + filePath,
            mode: "modify"
          }) // TODO remove modetype
        }
      }
      commits.set(hash, {
        author: { name: contributorName, email: authorEmail },
        committerTime,
        authorTime,
        hash,
        coauthors,
        fileChanges
      })
    }

    renamedFiles.push(
      ...FileModifications.map((modification) => {
        if (modification.type === "delete") {
          return {
            fromName: modification.path,
            toName: null,
            timestamp: modification.timestamp,
            timestampAuthor: modification.timestampAuthor
          }
        }
        return {
          fromName: null,
          toName: modification.path,
          timestamp: modification.timestamp,
          timestampAuthor: modification.timestampAuthor
        }
      })
    )
  }

  public async getFullCommits(gitLogResult: string) {
    const commits: FullCommitDTO[] = []
    const matches = gitLogResult.matchAll(gitLogRegex)
    for (const match of matches) {
      const groups = match.groups ?? {}
      const name = groups.author
      const authorEmail = groups.authorEmail
      const message = groups.message
      const body = groups.body
      const committerTime = Number(groups.dateCommitter)
      const authorTime = Number(groups.dateAuthor)
      const hash = groups.hash
      const contributionsString = groups.contributions
      const coauthors = getCoAuthors(body)
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
      commits.push({
        author: { name: name, email: authorEmail },
        committerTime,
        authorTime,
        hash,
        fileChanges,
        message,
        body,
        coauthors
      })
    }
    return commits
  }

  private async gatherCommitsInRange(
    start: number,
    end: number,
    commits: Map<string, GitLogEntry>,
    renamedFiles: RenameEntry[],
    index: number
  ) {
    const gitLogResult = await this.gitCaller.gitLogSimple(start, end - start, this, index)
    await this.gatherCommitsFromGitLog(gitLogResult, commits, renamedFiles)
    log.debug("done gathering")
  }

  private flattenChains(chains: RenameInterval[][]) {
    return chains.flatMap((chain) => {
      const destinationName = chain[0].toName
      return chain.map((interval) => ({ ...interval, toName: destinationName }) as RenameInterval)
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
      currentPathToRenameChain.set(file, [{ fromName: file, toName: file, timestamp: 0, timestampEnd: 4_000_000_000 }])

    for (const rename of orderedRenames) {
      // if file was deleted, we not care about what it was previously called
      if (rename.toName === null) continue
      const existing = currentPathToRenameChain.get(rename.toName)
      if (existing) {
        const prevRename = existing[existing.length - 1]
        prevRename.timestamp = rename.timestampEnd
        // rename.timestampEnd = prevRename.timestamp
        if (rename.fromName !== null) {
          // add rename to chain, and set the current rename to the newly found rename
          existing.push(rename)
          currentPathToRenameChain.set(rename.fromName, existing)
        } else {
          // if we found the time of file creation, we do not need to follow renames for it any more
          prevRename.timestamp = rename.timestampEnd
          finishedChains.push(existing)
        }
        currentPathToRenameChain.delete(rename.toName)
      }
    }

    finishedChains.push(...currentPathToRenameChain.values())
    return finishedChains
  }

  private getThreadCount(repoCommitCount: number) {
    const estimatedBytesPerCommit = 1300
    const minimumBytesPerThread = 400_000_000
    const systemMemoryToNotUse = 800_000_000
    const threadsToNotUse = 2

    const availableMemory =
      process.platform === "linux" || process.platform === "win32"
        ? freemem() - systemMemoryToNotUse
        : Math.floor(totalmem() / 2) - systemMemoryToNotUse // assume half of memory available
    const availableThreadCount = Math.min(Math.max(cpus().length - threadsToNotUse, 2), 4)
    if (availableMemory < 1) return availableThreadCount
    const estimatedBytesPerThread = Math.max(estimatedBytesPerCommit * repoCommitCount, minimumBytesPerThread)
    const threadsBasedOnMemory = Math.floor(availableMemory / estimatedBytesPerThread)
    return Math.max(2, Math.min(availableThreadCount, threadsBasedOnMemory))
  }

  private calculateSections(commitCount: number, threadCount: number): number[][] {
    const sections: number[][] = []
    // Make the section that gather recent commits slightly bigger,
    // as it is slower to get older commits
    if (threadCount === 2) {
      const section1Size = Math.floor((commitCount * 53) / 100)
      sections.push([0, section1Size])
      sections.push([section1Size, commitCount])
    } else if (threadCount === 3) {
      const section1Size = Math.floor((commitCount * 35) / 100)
      const section2Size = Math.floor((commitCount * 33) / 100)
      sections.push([0, section1Size])
      sections.push([section1Size, section1Size + section2Size])
      sections.push([section1Size + section2Size, commitCount])
    } else if (threadCount === 4) {
      const section1Size = Math.floor((commitCount * 27) / 100)
      const section2Size = Math.floor((commitCount * 26) / 100)
      const section3Size = Math.floor((commitCount * 24) / 100)
      sections.push([0, section1Size])
      sections.push([section1Size, section1Size + section2Size])
      sections.push([section1Size + section2Size, section1Size + section2Size + section3Size])
      sections.push([section1Size + section2Size + section3Size, commitCount])
    } else {
      throw new Error("Invalid threadCount. Only 2, 3, or 4 are allowed.")
    }
    return sections
  }

  public async loadRepoData() {
    this.analyzationStatus = "Starting"

    let commitCount = await this.gitCaller.getCommitCount()
    const priorRun = await InstanceManager.getOrCreateMetadataDB().getLastRun({
      repositoryPath: this.repositoryPath,
      branch: this.branch
    })
    if (!(await this.db.commitTableEmpty())) {
      if (priorRun) {
        const latestCommit = await this.db.getLatestCommitHash()
        commitCount = await this.gitCaller.commitCountSinceCommit(latestCommit, this.branch)
        log.debug(`Repo has been analyzed previously, only analyzing ${commitCount} commits`)
      } else {
        log.warn("Incomplete database found. Clearing and running complete analysis.")
        await this.db.clearAllTables()
      }
    }

    if (commitCount < 1) return
    const [quotePathDefaultValue] = await promiseHelper(this.gitCaller.getDefaultGitSettingValue("core.quotepath"))
    await promiseHelper(this.gitCaller.setGitSetting("core.quotePath", "off"))
    const [renamesDefaultValue] = await promiseHelper(this.gitCaller.getDefaultGitSettingValue("diff.renames"))
    await promiseHelper(this.gitCaller.setGitSetting("diff.renames", "true"))
    const [renameLimitDefaultValue] = await promiseHelper(this.gitCaller.getDefaultGitSettingValue("diff.renameLimit"))
    await promiseHelper(this.gitCaller.setGitSetting("diff.renameLimit", "1000000"))

    this.totalCommitCount = commitCount
    const threadCount = this.getThreadCount(commitCount)
    this.progress = Array(threadCount).fill(0)
    this.analyzationStatus = "Hydrating"
    const sections = this.calculateSections(commitCount, threadCount)
    const promises = Array.from({ length: threadCount }, async (_, i) => {
      const sectionStart = sections[i][0]
      const sectionEnd = sections[i][1]
      log.debug("start thread " + sectionStart + "-" + sectionEnd + ", " + i)
      await this.gathererWorker(sectionStart, sectionEnd, i)
      log.debug("finished thread: " + i)
    })

    await Promise.all(promises)

    await this.db.createIndexes()
    await this.db.checkpoint()
    if (quotePathDefaultValue) {
      await promiseHelper(this.gitCaller.resetGitSetting("core.quotepath", quotePathDefaultValue))
    }
    if (renamesDefaultValue) {
      await promiseHelper(this.gitCaller.resetGitSetting("diff.renames", renamesDefaultValue))
    }
    if (renameLimitDefaultValue) {
      await promiseHelper(this.gitCaller.resetGitSetting("diff.renameLimit", renameLimitDefaultValue))
    }

    await InstanceManager.getOrCreateMetadataDB().setCompletion(
      { repositoryPath: this.repositoryPath, branch: this.branch },
      await this.db.getLatestCommitHash()
    )
    this.analyzationStatus = "GeneratingChart"
  }
}
