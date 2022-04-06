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
import { gitDiffNumStatAnalyzed, lookupFileInTree } from "./util"
import { Queue } from "./queue"

const renamedFiles = new Map<string, string>()

const authors = new Set<string>()

export async function hydrateData(
  repo: string,
  commit: GitCommitObject
): Promise<HydratedGitCommitObject> {
  const data = commit as HydratedGitCommitObject

  initially_mut(data)

  const { hash: first } = data

  await bfs(first, repo, data)

  finally_mut(data)

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
  data.historicGraph = { head: data.hash, edges: {} }
  data.hashToGitCommitObjectLight = {}

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
      data.historicGraph.edges[currHash] = parentHash
      data.hashToGitCommitObjectLight[currHash] = currCommit

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

async function diffAndUpdate_mut(
  data: HydratedGitCommitObject,
  currCommit: GitCommitObjectLight,
  parentHash: string
) {
  const { author } = currCommit

  const currHash = currCommit.hash

  log.debug(`comparing [${currHash}] -> [${parentHash}]`)

  const fileChanges = await gitDiffNumStatAnalyzed(
    parentHash,
    currHash,
    renamedFiles
  )

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
    noLines: isBinary ? 0 : blob.content?.split("\n").length,
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

function finally_mut(data: HydratedGitCommitObject) {
  discardContentField_mut(data.tree)
}

function discardContentField_mut(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.content = undefined
    } else {
      discardContentField_mut(child)
    }
  }
}
