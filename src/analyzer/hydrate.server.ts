import type {
  FileChange,
  GitBlobObject,
  GitCommitObject,
  GitLogEntry,
  GitTreeObject,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject
} from "./model"
import { analyzeRenamedFile, tableName } from "./util.server"
import { GitCaller } from "./git-caller.server"
import { getCoAuthors } from "./coauthors.server"
import { log } from "./log.server"
import { gitLogRegex, contribRegex } from "./constants"
import { cpus } from "os"
import { setAnalyzationStatus } from "./analyze.server"
import DB from "./DB"

let renamedFiles: Map<string, { path: string; timestamp: number }[]>
let authors: Set<string>

let git: GitCaller
let db: DB

export function gatherCommitsFromGitLog(
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

    log.debug(`Checking commit from ${time}`)

    if (handleAuthors) {
      authors.add(author)
      for (const coauthor of coauthors) authors.add(coauthor.name)
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
          filePath = analyzeRenamedFile(filePath, renamedFiles, time)
        }

        const contribs = isBinary
          ? 1
          : Number(contribMatch.groups?.insertions ?? "0") + Number(contribMatch.groups?.deletions ?? "0")
        fileChanges.push({ isBinary, contribs, path: filePath })
      }
    }
    commits.set(hash, { author, time, body, message, hash, coauthors, fileChanges })
  }
}

async function gatherCommitsInRange(start: number, end: number, commits: Map<string, GitLogEntry>) {
  const gitLogResult = await git.gitLog(start, end - start)
  gatherCommitsFromGitLog(gitLogResult, commits, true)
}

async function updateCreditOnBlob(blob: HydratedGitBlobObject, commit: GitLogEntry, change: FileChange) {
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

export let progress = 0
export let totalCommitCount = Infinity

export async function hydrateData(commit: GitCommitObject, repo: string, branch: string, _git: GitCaller): Promise<[HydratedGitCommitObject, string[]]> {
  git = _git
  db = new DB(repo, branch)

  const data = commit as HydratedGitCommitObject
  const fileMap = convertFileTreeToMap(data.tree)
  initially_mut(data)
  const commitCount = await git.getCommitCount()
  totalCommitCount = commitCount
  const threadCount = cpus().length > 4 ? 4 : 2
  // Dynamically set commitBundleSize, such that progress indicator is smoother for small repos
  const commitBundleSize = Math.min(Math.max(commitCount / 4, 10_000), 150_000)
  
  if (commitCount > 500_000)
  log.warn(
"This repo has a lot of commits, so nodejs might run out of memory. Consider setting the environment variable NODE_OPTIONS to --max-old-space-size=4096 and rerun Git Truck"
)
setAnalyzationStatus("Hydrating")
// Sync threads every commitBundleSize commits to reset commits map, to reduce peak memory usage
for (let index = 0; index < commitCount; index += commitBundleSize) {
    progress = index
    const runCountCommit = Math.min(commitBundleSize, commitCount - index)
    const sectionSize = Math.ceil(runCountCommit / threadCount)
    
    const commits = new Map<string, GitLogEntry>()

    const promises = Array.from({ length: threadCount }, (_, i) => {
      const sectionStart = index + i * sectionSize
      let sectionEnd = sectionStart + sectionSize
      if (sectionEnd > commitCount) sectionEnd = runCountCommit
      log.info("start thread " + sectionStart + "-" + sectionEnd)
      return gatherCommitsInRange(sectionStart, sectionEnd, commits)
    })
    
    await Promise.all(promises)
    
    const start = Date.now()
    await db.addCommits(commits)
    const end = Date.now()
    console.log("add commits ms", end - start)
    
    await hydrateBlobs(fileMap, commits)
    log.info("threads synced")
  }
  
  console.time("commitquery")
  const rows = await db.query(`SELECT author, COUNT(*) as commit_count
  FROM commits
  GROUP BY author
  ORDER BY commit_count DESC
  LIMIT 10;`)
  console.timeEnd("commitquery")
  console.log(rows)

  const rows2 = await db.query(`SELECT author, message, body
  FROM commits
  LIMIT 10;`)
  console.log("rows2", rows2)

  const rows3 = await db.query(`select *
  FROM filechanges
  LIMIT 40;`)
  console.log("rows3", rows3)

  const rowCount = await db.query(`select count (*) from commits;`)
  console.log("row count", rowCount)

  sortCommits(fileMap)
  return [data, Array.from(authors)]
}

function sortCommits(fileMap: Map<string, GitBlobObject>) {
  fileMap.forEach((blob, _) => {
    const cast = blob as HydratedGitBlobObject
    cast.commits?.sort((a, b) => {
      return b.time - a.time
    })
  })
}

async function hydrateBlobs(files: Map<string, GitBlobObject>, commits: Map<string, GitLogEntry>) {
  for (const [, commit] of commits) {
    for (const change of commit.fileChanges) {
      let recentChange = { path: change.path, timestamp: commit.time }
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rename = getRecentRename(recentChange.timestamp, recentChange.path)
        if (!rename) break
        recentChange = rename
      }
      const blob = files.get(recentChange.path)
      if (!blob) {
        continue
      }
      await updateCreditOnBlob(blob as HydratedGitBlobObject, commit, change)
    }
  }
}

function convertFileTreeToMap(tree: GitTreeObject) {
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

function getRecentRename(targetTimestamp: number, path: string) {
  const renames = renamedFiles.get(path)
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

function initially_mut(data: HydratedGitCommitObject) {
  data.oldestLatestChangeEpoch = Number.MAX_VALUE
  data.newestLatestChangeEpoch = Number.MIN_VALUE
  authors = new Set()
  renamedFiles = new Map<string, { path: string; timestamp: number }[]>()

  addAuthorsField_mut(data.tree)
}

function addAuthorsField_mut(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.authors = {}
    } else {
      addAuthorsField_mut(child)
    }
  }
}
