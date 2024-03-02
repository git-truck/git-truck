import DB from "./DB"
import { GitCaller } from "./git-caller.server"
import type { GitBlobObject, GitCommitObject, GitCommitObjectLight, GitTreeObject, RawGitObject, HydratedGitCommitObject, GitLogEntry, FileChange, HydratedGitBlobObject, HydratedGitTreeObject } from "./model"
import { log, setLogLevel } from "./log.server"
import { analyzeRenamedFile } from "./util.server"
import { getCoAuthors } from "./coauthors.server";
import { contribRegex, emptyGitCommitHash, gitLogRegex, treeRegex } from "./constants";
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

    private renamedFiles: Map<string, { path: string; timestamp: number }[]> = new Map()
    private renamedFilesNew: {from: string, to: string, time: number}[] = []
    private authors: Set<string> = new Set()

    constructor(public repo: string, public branch: string, public path: string) {
        this.repoSanitized = repo.replace(/\W/g, "_")
        this.branchSanitized = branch.replace(/\W/g, "_")
        this.gitCaller = new GitCaller(repo, branch, path)
        this.db = new DB(repo, branch)
    }

      private async analyzeCommitLight(hash: string): Promise<GitCommitObjectLight> {
        const rawContent = await this.gitCaller.catFileCached(hash)
        const commitRegex =
          /tree (?<tree>.*)\s*(?:parent (?<parent>.*)\s*)?(?:parent (?<parent2>.*)\s*)?author (?<authorName>.*?) <(?<authorEmail>.*?)> (?<authorTimeStamp>\d*?) (?<authorTimeZone>.*?)\s*committer (?<committerName>.*?) <(?<committerEmail>.*?)> (?<committerTimeStamp>\d*?) (?<committerTimeZone>.*)\s*(?:gpgsig (?:.|\s)*?-----END (?:PGP SIGNATURE|SIGNED MESSAGE)-----)?\s*(?<message>.*)\s*(?<description>(?:.|\s)*)/gm
      
        const match = commitRegex.exec(rawContent)
        const groups = match?.groups ?? {}
      
        const tree = groups["tree"]
        const parent = groups["parent"] ?? emptyGitCommitHash
        const parent2 = groups["parent2"] ?? null
        const author = {
          name: groups["authorName"],
          email: groups["authorEmail"],
          timestamp: Number(groups["authorTimeStamp"]),
          timezone: groups["authorTimeZone"]
        }
        const committer = {
          name: groups["committerName"],
          email: groups["committerEmail"],
          timestamp: Number(groups["committerTimeStamp"]),
          timezone: groups["committerTimeZone"]
        }
        const message = groups["message"]
        const description = groups["description"]
        const coauthors = description ? getCoAuthors(description) : []
      
        return {
          type: "commit",
          hash,
          tree,
          parent,
          parent2,
          author,
          committer,
          message,
          description,
          coauthors
        }
      }
      
      private async analyzeCommit(repoName: string, hash: string): Promise<GitCommitObject> {
        if (hash === undefined) {
          throw Error("Hash is required")
        }
        const { tree, ...commit } = await this.analyzeCommitLight(hash)
        const { rootTree, fileCount } = await this.analyzeTree(tree)
        const commitObject = {
          ...commit,
          fileCount,
          tree: rootTree
        }
        return commitObject
      }

      
public async analyzeTree(hash: string) {
  const rawContent = await this.gitCaller.lsTree(hash)
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
    hash,
    children: []
  } as GitTreeObject

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
      case "tree":
        const newTree: GitTreeObject = {
          type: "tree",
          path: newPath,
          name: newName,
          hash: child.hash,
          children: []
        }

        currTree.children.push(newTree)

        break
      case "blob":
        fileCount += 1
        const blob: GitBlobObject = {
          type: "blob",
          hash: child.hash,
          path: newPath,
          name: newName,
          sizeInBytes: child.size as number,
        }
        currTree.children.push(blob)
        break
    }
  }

  // await Promise.all(jobs)
  return { rootTree, fileCount }
}


public async gatherCommitsFromGitLog(
  gitLogResult: string,
  commits: Map<string, GitLogEntry>,
  handleAuthors: boolean
) {
  const matches = gitLogResult.matchAll(gitLogRegex)
  for (const match of matches) {
    const groups = match.groups ?? {}
    const author = groups.author
    const time = Number(groups.date)
    const body = groups.body
    const message = groups.message
    const hash = groups.hash
    const contributionsString = groups.contributions
    const coauthors = body ? getCoAuthors(body) : []
    const fileChanges: FileChange[] = []


    if (handleAuthors) {
      this.authors.add(author)
      for (const coauthor of coauthors) this.authors.add(coauthor.name)
    }

    if (contributionsString) {
      const contribMatches = contributionsString.matchAll(contribRegex)
      for (const contribMatch of contribMatches) {
        const file = contribMatch.groups?.file.trim()
        const isBinary = contribMatch.groups?.insertions === "-"
        if (!file) throw Error("file not found")

        let filePath = file
        const fileHasMoved = file.includes("=>")
        if (fileHasMoved) {
          filePath = analyzeRenamedFile(filePath, this.renamedFiles, time, this.renamedFilesNew)
        }

        const contribs = isBinary
          ? 1
          : Number(contribMatch.groups?.insertions ?? "0") + Number(contribMatch.groups?.deletions ?? "0")
        fileChanges.push({ isBinary, contribs, path: filePath })
      }
    }
    commits.set(hash, { author, time, body, message, hash, coauthors, fileChanges })
  }
  this.db.addRenames(this.renamedFilesNew)
}

private async gatherCommitsInRange(start: number, end: number, commits: Map<string, GitLogEntry>) {
  const gitLogResult = await this.gitCaller.gitLog(start, end - start)
  this.gatherCommitsFromGitLog(gitLogResult, commits, true)
  log.debug("done gathering")
}

private async updateCreditOnBlob(blob: HydratedGitBlobObject, commit: GitLogEntry, change: FileChange) {
  blob.noCommits = (blob.noCommits ?? 0) + 1
  if (blob.commits) {
    blob.commits.push({ hash: commit.hash, time: commit.time })
  } else {
    blob.commits = [{ hash: commit.hash, time: commit.time }]
  }
  if (!blob.lastChangeEpoch || blob.lastChangeEpoch < commit.time) blob.lastChangeEpoch = commit.time

  if (change.isBinary) {
    blob.isBinary = true
    blob.authors[commit.author] = (blob.authors[commit.author] ?? 0) + 1

    for (const coauthor of commit.coauthors) {
      blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + 1
    }
    return
  }
  if (change.contribs === 0) return // in case a rename with no changes, this happens
  blob.authors[commit.author] = (blob.authors[commit.author] ?? 0) + change.contribs

  for (const coauthor of commit.coauthors) {
    blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + change.contribs
  }
}

public async hydrateData() {
  // const fileMap = this.convertFileTreeToMap(data.tree)
  setLogLevel("DEBUG")
  let commitCount = await this.gitCaller.getCommitCount()
  if (await this.db.hasCompletedPreviously()) {
    log.debug("going in")
    const latestCommit = await this.db.getLatestCommitHash()
    commitCount = await this.gitCaller.commitCountSinceCommit(latestCommit)
    log.info(`Repo has been analyzed previously, only analzying ${commitCount} commits`)
  }
  this.totalCommitCount = commitCount
  const threadCount = Math.min(cpus().length > 4 ? 4 : 2, commitCount)
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
    
    const start = Date.now()
    log.debug("adding")
    await this.db.addCommits(commits)
    log.debug("done adding")
    const end = Date.now()
    console.log("add commits ms", end - start)
    
    // await this.hydrateBlobs(fileMap, commits)
    log.info("threads synced")
  }

  // this.sortCommits(fileMap)
  await this.db.setFinishTime()
  // return [data, Array.from(this.authors)]
}

private sortCommits(fileMap: Map<string, GitBlobObject>) {
  fileMap.forEach((blob, _) => {
    const cast = blob as HydratedGitBlobObject
    cast.commits?.sort((a, b) => {
      return b.time - a.time
    })
  })
}

private async hydrateBlobs(files: Map<string, GitBlobObject>, commits: Map<string, GitLogEntry>) {
  for (const [, commit] of commits) {
    for (const change of commit.fileChanges) {
      let recentChange = { path: change.path, timestamp: commit.time }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rename = this.getRecentRename(recentChange.timestamp, recentChange.path)
        if (!rename) break
        recentChange = rename
      }
      const blob = files.get(recentChange.path)
      if (!blob) {
        continue
      }
      // await this.updateCreditOnBlob(blob as HydratedGitBlobObject, commit, change)
    }
  }
}

private convertFileTreeToMap(tree: GitTreeObject) {
  const map = new Map<string, GitBlobObject>()

  function aux(recTree: GitTreeObject) {
    for (const child of recTree.children) {
      if (child.type === "blob") {
        map.set(child.path.substring(child.path.indexOf("/") + 1), child)
      } else {
        aux(child)
      }
    }
  }

  aux(tree)
  return map
}

private getRecentRename(targetTimestamp: number, path: string) {
  const renames = this.renamedFiles.get(path)
  if (!renames) return undefined

  let minTimestamp = Infinity
  let resultRename = undefined

  for (const rename of renames) {
    const currentTimestamp = rename.timestamp
    if (currentTimestamp > targetTimestamp && currentTimestamp < minTimestamp) {
      minTimestamp = currentTimestamp
      resultRename = rename
    }
  }

  if (minTimestamp === Infinity) return undefined
  return resultRename
}

private initially_mut(data: HydratedGitCommitObject) {
  data.oldestLatestChangeEpoch = Number.MAX_VALUE
  data.newestLatestChangeEpoch = Number.MIN_VALUE
  this.authors = new Set()
  this.renamedFiles = new Map<string, { path: string; timestamp: number }[]>()

  this.addAuthorsField_mut(data.tree)
}

private addAuthorsField_mut(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.authors = {}
    } else {
      this.addAuthorsField_mut(child)
    }
  }
}


}
