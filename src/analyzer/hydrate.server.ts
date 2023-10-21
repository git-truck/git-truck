import type {
  GitCommitObject,
  GitLogEntry,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
} from "./model"
import { analyzeRenamedFile, lookupFileInTree } from "./util.server"
import { GitCaller } from "./git-caller.server"
import { getCoAuthors } from "./coauthors.server"
import { log } from "./log.server"
import { gitLogRegex, contribRegex } from "./constants"
import { cpus } from "os"

const renamedFiles = new Map<string, string>()
const commits: Record<string, GitLogEntry> = {}
const authors = new Set<string>()

async function hydrateCommitRange(start: number, end: number, data: HydratedGitCommitObject) {
  const maxCommitsPerRun = 20000
  for (let commitIndex = start; commitIndex < end; commitIndex += maxCommitsPerRun) {
    if (commitIndex > end) commitIndex = end;
    const commitCountToGet = Math.min(end - commitIndex, maxCommitsPerRun)
    const gitLogResult = await GitCaller.getInstance().gitLog(commitIndex, commitCountToGet)

    const matches = gitLogResult.matchAll(gitLogRegex)
    for (const match of matches) {
      const groups = match.groups ?? {}
      const author = groups.author
      const time = Number(groups.date)
      const body = groups.body
      const message = groups.message
      const hash = groups.hash
      commits[hash] = { author, time, body, message, hash }
      const contributionsString = groups.contributions
      const coauthors = body ? getCoAuthors(body) : []

      log.debug(`Checking commit from ${time}`)

      authors.add(author)
      coauthors.forEach((coauthor) => authors.add(coauthor.name))

      if (!contributionsString) continue
      const contribMatches = contributionsString.matchAll(contribRegex)
      for (const contribMatch of contribMatches) {
        const file = contribMatch.groups?.file.trim()
        const isBinary = contribMatch.groups?.insertions === "-"
        if (!file) throw Error("file not found")

        const hasBeenMoved = file.includes("=>")

        let filePath = file
        if (hasBeenMoved) {
          filePath = analyzeRenamedFile(filePath, renamedFiles)
        }

        const newestPath = renamedFiles.get(filePath) ?? filePath

        const contribs = isBinary ? 1 : Number(contribMatch.groups?.insertions) + Number(contribMatch.groups?.deletions)
        if (contribs < 1) continue
        // if (!mutexes.has(newestPath)) {
        //   mutexes.set(newestPath, new Mutex())
        // }
        // let mutex
        // while (!mutex) mutex = mutexes.get(newestPath)
        // await mutex.acquire()

        const blob = lookupFileInTree(data.tree, newestPath) as HydratedGitBlobObject
        if (!blob) {
          continue
        }
        while (blob.mutex.isLocked());
        await blob.mutex.acquire()
        try {
          if (!blob.commits) blob.commits = []
          blob.commits.push(hash)
          blob.noCommits = (blob.noCommits ?? 0) + 1
          if (!blob.lastChangeEpoch) blob.lastChangeEpoch = time

          if (isBinary) {
            blob.isBinary = true
            blob.authors[author] = (blob.authors[author] ?? 0) + 1

            for (const coauthor of coauthors) {
              blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + 1
            }
            continue
          }

          blob.authors[author] = (blob.authors[author] ?? 0) + contribs

          for (const coauthor of coauthors) {
            blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + contribs
          }
        } finally {
          blob.mutex.release()
        }
      }
    }
  }
}

export async function hydrateData(
  commit: GitCommitObject
): Promise<[HydratedGitCommitObject, string[], Record<string, GitLogEntry>]> {
  const data = commit as HydratedGitCommitObject

  initially_mut(data)

  const commitCount = await GitCaller.getInstance().getCommitCount()
  console.log("true commit count", commitCount)
  const threadCount = Math.max(cpus().length - 2, 2);

  const sectionSize = Math.ceil(commitCount / threadCount);

  const promises = Array.from({ length: threadCount }, (_, i) => {
    const sectionStart = i * sectionSize;
    let sectionEnd = (i + 1) * sectionSize;
    if (sectionEnd > commitCount) sectionEnd = commitCount
    return hydrateCommitRange(sectionStart, sectionEnd, data);
  });

  await Promise.all(promises)
  console.log("commit count found", Object.keys(commits).length)
  return [data, Array.from(authors), commits]
}

function initially_mut(data: HydratedGitCommitObject) {
  data.oldestLatestChangeEpoch = Number.MAX_VALUE
  data.newestLatestChangeEpoch = Number.MIN_VALUE

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
