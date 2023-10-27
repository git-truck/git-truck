import type {
  GitCommitObject,
  GitLogEntry,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
  Person,
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
const skippedBlobs = new Map<string, SkippedContrib>()

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

        const blob = lookupFileInTree(data.tree, newestPath)
        if (!blob) {
          skippedBlobs.set(newestPath, {blobPath: newestPath, commitHash: hash, isBinary, contribs, coauthors})
          continue
        }
        await updateCreditOnBlob(blob as HydratedGitBlobObject, commits[hash], isBinary, contribs, coauthors)
      }
    }
  }
}

interface SkippedContrib {
  blobPath: string,
  commitHash: string,
  isBinary: boolean,
  contribs: number,
  coauthors: Person[]
}

async function updateCreditOnBlob(blob: HydratedGitBlobObject, commit: GitLogEntry, isBinary: boolean, contribs: number, coauthors: Person[]) {
  await blob.mutex.acquire()
  try {
    if (!blob.commits) blob.commits = []
    blob.commits.push(commit.hash)
    blob.noCommits = (blob.noCommits ?? 0) + 1
    if (!blob.lastChangeEpoch || blob.lastChangeEpoch < commit.time) blob.lastChangeEpoch = commit.time

    if (isBinary) {
      blob.isBinary = true
      blob.authors[commit.author] = (blob.authors[commit.author] ?? 0) + 1

      for (const coauthor of coauthors) {
        blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + 1
      }
      return
    }

    blob.authors[commit.author] = (blob.authors[commit.author] ?? 0) + contribs

    for (const coauthor of coauthors) {
      blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + contribs
    }
  } finally {
    blob.mutex.release()
  }
}

export async function hydrateData(
  commit: GitCommitObject
): Promise<[HydratedGitCommitObject, string[], Record<string, GitLogEntry>]> {
  const data = commit as HydratedGitCommitObject

  initially_mut(data)

  const commitCount = await GitCaller.getInstance().getCommitCount()
  console.log("true commit count", commitCount)
  // const threadCount = Math.max(cpus().length - 2, 2);
  const threadCount = 8

  const sectionSize = Math.ceil(commitCount / threadCount);

  const promises = Array.from({ length: threadCount }, (_, i) => {
    const sectionStart = i * sectionSize;
    let sectionEnd = (i + 1) * sectionSize;
    if (sectionEnd > commitCount) sectionEnd = commitCount
    return hydrateCommitRange(sectionStart, sectionEnd, data);
  });

  await Promise.all(promises)
  
  // let renameFound = true
  // while (renameFound) {
  //   renameFound = false
  //   for (const [key, skipped] of skippedBlobs) {
  //     const rename = renamedFiles.get(key)
  //     if (!rename) {
  //       continue
  //     }
  //     renameFound = true
  //     const blob = lookupFileInTree(data.tree, rename)
  //     if (blob) {
  //       await updateCreditOnBlob(blob as HydratedGitBlobObject, commits[skipped.commitHash], skipped.isBinary, skipped.contribs, skipped.coauthors)
  //       continue
  //     }
  //     const ren = skippedBlobs.get(rename)
  //     if (ren) {
  //       await updateCreditOnBlob()
  //     } else {
  //       skippedBlobs.delete(rename)
  //     }
  //   }
  // }

  for (const [p, blobContrib] of skippedBlobs) {
    const path = getNewestPath(p)
    const foundBlob = lookupFileInTree(data.tree, path)
    if (!foundBlob) {
      if (p !== path)
        console.log("soinks", p, path)
      continue
    }
    console.log("jubii", path)
    updateCreditOnBlob(foundBlob as HydratedGitBlobObject, commits[blobContrib.commitHash], blobContrib.isBinary, blobContrib.contribs, blobContrib.coauthors)
  }

  console.log("commit count found", Object.keys(commits).length)
  return [data, Array.from(authors), commits]
}

function initially_mut(data: HydratedGitCommitObject) {
  data.oldestLatestChangeEpoch = Number.MAX_VALUE
  data.newestLatestChangeEpoch = Number.MIN_VALUE

  addAuthorsField_mut(data.tree)
}

function getNewestPath(path: string) {
  let newestPath = path
  let ren = renamedFiles.get(newestPath)
  while (ren) {
    newestPath = ren
    ren = renamedFiles.get(newestPath)
  }
  return newestPath
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
