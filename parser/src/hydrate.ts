import { emptyGitCommitHash } from "./constants"
import { log } from "./log"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
  PersonWithTime,
} from "./model"
import { parseCommitLight } from "./parse"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util"
import { Queue } from "./queue"

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

function initially_mut(data: HydratedGitCommitObject) {
  data.minNoCommits = Number.MAX_VALUE
  data.maxNoCommits = Number.MIN_VALUE
  
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
  const marked = new Set<string>()
  const queue = new Queue<string>()

  marked.add(first)
  queue.enqueue(first)

  while (!queue.isEmpty()) {
    const currHash = queue.dequeue()
    marked.add(currHash)

    // don't compare the empty commit to it's parent
    if (currHash == emptyGitCommitHash) continue

    const currCommit = await parseCommitLight(repo, currHash)

    const parentsOfCurr = parents(currCommit)

    for (const parentHash of parentsOfCurr) {
      if (marked.has(parentHash)) continue

      switch (parentsOfCurr.size) {
        case 2: // curr is a merge commit
          queue.enqueue(parentHash)
          break;
        case 1: // curr is a linear commit
          diffAndUpdate_mut(data, currCommit, parentHash, repo)
          queue.enqueue(parentHash)
          break;
        default: // curr is the root commit
          diffAndUpdate_mut(data, currCommit, emptyGitCommitHash, repo)
          break;
      }
    }
  }
}

function parents(obj : GitCommitObject|GitCommitObjectLight) : Set<string> {
  const parents = new Set<string>()

  if (obj.parent !== null)
    parents.add(obj.parent)
  if (obj.parent2 !== null)
    parents.add(obj.parent2)

  return parents
}

async function diffAndUpdate_mut(data: HydratedGitCommitObject, currCommit: GitCommitObjectLight, parentHash: string, repo: string) {
    const { author, ...restof } = currCommit

    const currHash = currCommit.hash

    log.debug(`comparing [${currHash}] -> [${parentHash}]`)

    const fileChanges = await gitDiffNumStatParsed(repo, currHash, parentHash)

    for (const fileChange of fileChanges) {

      const { pos, neg, file } = fileChange

      const blob = await lookupFileInTree(data.tree, file)

      if (file === "dev/null") continue
      if (blob) {
        updateBlob_mut(blob, data, author, currCommit, pos, neg)
      }
    }
}

function updateBlob_mut(
  blob: GitBlobObject,
  data: HydratedGitCommitObject,
  author: PersonWithTime,
  currCommit: GitCommitObjectLight,
  pos: number,
  neg: number
) {
  const noCommits = 1 + ((blob as HydratedGitBlobObject).noCommits ?? 0)

  if (noCommits < data.minNoCommits)
    data.minNoCommits = noCommits
  if (noCommits > data.maxNoCommits)
    data.maxNoCommits = noCommits

  const hydratedBlob = {
    ...blob,
    authors: (blob as HydratedGitBlobObject).authors ?? {},
    noLines: blob.content.split("\n").length,
    noCommits: noCommits,
  } as HydratedGitBlobObject

  const current = hydratedBlob.authors?.[author.name] ?? 0

  for (const coauthor of currCommit.coauthors) {
    hydratedBlob.authors[coauthor.name] = current + pos + neg
  }

  hydratedBlob.authors[author.name] = current + pos + neg

  Object.assign(blob, hydratedBlob)
}

function finally_mut(data : HydratedGitCommitObject) {
  discardContentField_mut(data.tree)
}

function discardContentField_mut(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.content = ""
    } else {
      discardContentField_mut(child)
    }
  }
}
