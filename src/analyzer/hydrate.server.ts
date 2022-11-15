import type { GitCommitObject, GitLogEntry, HydratedGitBlobObject, HydratedGitCommitObject, HydratedGitTreeObject } from "./model"
import { analyzeRenamedFile, lookupFileInTree } from "./util.server"
import { GitCaller } from "./git-caller.server"
import { getCoAuthors } from "./coauthors.server"
import { log } from "./log.server"
import { gitLogRegex, contribRegex } from "./constants"
import { Worker } from "worker_threads"

const worker = new Worker("./src/analyzer/backgroundable/worker.mjs")
let authors: Set<string> = undefined
let commits: Record<string, GitLogEntry> = undefined
export async function hydrateData(commit: GitCommitObject): Promise<IterableIterator<RegExpMatchArray>> {
  const data = commit as HydratedGitCommitObject
  initially_mut(data)
  const gitLogResult = await GitCaller.getInstance().gitLog()
  const matches = gitLogResult.matchAll(gitLogRegex)
  authors = new Set<string>()
  commits = {}
  worker.on("message", (result) => {
    console.log(result)
  })

  return matches
}

function initially_mut(data: HydratedGitCommitObject) {
  data.oldestLatestChangeEpoch = Number.MAX_VALUE
  data.newestLatestChangeEpoch = Number.MIN_VALUE

  addAuthorsField_mut(data.tree)
}

export function workerTest(repoTree: any, commit: any) {
  worker.postMessage({ repoTree, commit })
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
