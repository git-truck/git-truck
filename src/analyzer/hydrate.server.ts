import { emptyGitCommitHash } from "./constants"
import isBinaryPath from "is-binary-path"
import { join } from "path"
import { log } from "./log.server"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
  Person,
  PersonWithTime,
} from "./model"
import { analyzeCommitLight } from "./analyze.server"
import { analyzeRenamedFile, gitDiffNumStatAnalyzed, lookupFileInTree } from "./util.server"
import { Queue } from "./queue"
import { GitCaller } from "./git-caller.server"
import { getCoAuthors } from "./coauthors.server"

const renamedFiles = new Map<string, string>()

const authors = new Set<string>()

export async function hydrateData(repo: string, commit: GitCommitObject): Promise<HydratedGitCommitObject> {
  const data = commit as HydratedGitCommitObject

  initially_mut(data)

  const { hash: first } = data

  // await bfs(first, repo, data)

  const gitLogResult = await GitCaller.getInstance().gitLog()

  const gitLogRegex =
    /"author\s+<\|(?<author>.+?)\|>\s+date\s+<\|(?<date>\d+)\|>\s+body\s+<\|(?<body>(?:\s|.)*?)\|>"\s+(?<contributions>(?:\s*.+\s+\|\s+\d+\s\+*-*\s)+).*/gm
  const contribRegex = /(?<file>.*?)\s*\|\s*(?<contribs>\d*).*/gm

  const matches = gitLogResult.matchAll(gitLogRegex)
  for (const match of matches) {
    const groups = match.groups ?? {}
    const author = groups.author
    const time = Number(groups.date)
    const body = groups.body
    const contributionsString = groups.contributions
    const coauthors = getCoAuthors(body)

    const contribMatches = contributionsString.matchAll(contribRegex)
    for (const contribMatch of contribMatches) {
      // log.debug(`giving ${contribMatch.groups?.contribs} to ${author} for ${contribMatch.groups?.file}`)
      const file = contribMatch.groups?.file
      if (!file) continue

      const hasBeenMoved = file.includes("=>")

      let filePath = file
      if (hasBeenMoved) {
        filePath = analyzeRenamedFile(filePath, renamedFiles)
      }

      if (file.includes("PathContext.ts")) {
        log.debug(`file: ${file}`)
        log.debug(`hasBeenMoved: ${hasBeenMoved}`)
        log.debug(`filepath: ${filePath}`)
      }

      const newestPath = renamedFiles.get(filePath) ?? filePath

      const contribs = Number(contribMatch.groups?.contribs)
      if (contribs < 1) continue
      // log.debug(`looking up ${newestPath}`)
      const blob = (await lookupFileInTree(data.tree, newestPath)) as HydratedGitBlobObject
      if (!blob) {
        continue
      }
      blob.authors[author] = (blob.authors[author] ?? 0) + contribs

      for (const coauthor of coauthors) {
        blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + contribs
      }
    }
  }
  // log.debug(`renames: ${renamedFiles.size}`)
  // for (const entry of renamedFiles) {
  //   log.debug(`[${entry[0]} => ${entry[1]}]`)
  // }

  return data
}

export function getAuthorSet() {
  return Array.from(authors)
}

function initially_mut(data: HydratedGitCommitObject) {
  data.minNoCommits = Number.MAX_VALUE
  data.maxNoCommits = Number.MIN_VALUE
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

async function bfs(first: string, repo: string, data: HydratedGitCommitObject) {
  const expandedHashes = new Set<string>()
  const queue = new Queue<string>()

  queue.enqueue(first)

  while (!queue.isEmpty()) {
    const currHash = queue.dequeue()

    if (expandedHashes.has(currHash)) continue

    expandedHashes.add(currHash)

    // don't compare the empty commit to it's parent
    if (currHash == emptyGitCommitHash) continue

    const currCommit = await analyzeCommitLight(currHash)
    authors.add((currCommit.author as Person).name)
    for (const person of currCommit.coauthors) authors.add(person.name)

    const parentsOfCurr = parents(currCommit)

    for (const parentHash of parentsOfCurr) {
      switch (parentsOfCurr.size) {
        case 2: // curr is a merge commit
          queue.enqueue(parentHash)
          break
        case 1: // curr is a linear commit
          await diffAndUpdate_mut(data, currCommit, parentHash)
          queue.enqueue(parentHash)
          break
        default:
          // curr is the root commit
          await diffAndUpdate_mut(data, currCommit, emptyGitCommitHash)
          break
      }
    }
  }
}

function parents(obj: GitCommitObject | GitCommitObjectLight): Set<string> {
  const parents = new Set<string>()

  if (obj.parent !== null) parents.add(obj.parent)
  if (obj.parent2 !== null) parents.add(obj.parent2)

  return parents
}

async function diffAndUpdate_mut(data: HydratedGitCommitObject, currCommit: GitCommitObjectLight, parentHash: string) {
  const { author } = currCommit

  const currHash = currCommit.hash

  log.debug(`comparing [${currHash}] -> [${parentHash}]`)

  const fileChanges = await gitDiffNumStatAnalyzed(parentHash, currHash, renamedFiles)

  for (const fileChange of fileChanges) {
    const { pos, neg, file } = fileChange

    const blob = await lookupFileInTree(data.tree, file)

    if (file === "dev/null") continue
    if (blob) {
      updateBlob_mut(blob, author, currCommit, pos, neg)
    }
  }
}

function isBinaryFile(blob: GitBlobObject) {
  return isBinaryPath(join(blob.path, blob.name))
}

function updateBlob_mut(
  blob: GitBlobObject,
  author: PersonWithTime,
  currCommit: GitCommitObjectLight,
  pos: number,
  neg: number
) {
  const noCommits = 1 + ((blob as HydratedGitBlobObject).noCommits ?? 0)

  const isBinary = isBinaryFile(blob)

  const hydratedBlob = {
    ...blob,
    authors: (blob as HydratedGitBlobObject).authors ?? {},
    noCommits: noCommits,
    isBinary: isBinary,
  } as HydratedGitBlobObject

  if (!isBinary) {
    const current = hydratedBlob.authors?.[author.name] ?? 0

    const newValue = current + pos + neg
    if (newValue > 0) {
      for (const coauthor of currCommit.coauthors) {
        hydratedBlob.authors[coauthor.name] = newValue
      }
      hydratedBlob.authors[author.name] = newValue
    }
  }

  if (!hydratedBlob.lastChangeEpoch) {
    const epoch = currCommit.author.timestamp
    hydratedBlob.lastChangeEpoch = epoch
  }

  Object.assign(blob, hydratedBlob)
  log.debug(`Updated blob ${blob.name} from commit ${currCommit.hash}`)
}
