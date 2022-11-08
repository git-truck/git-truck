import type { GitCommitObject, GitLogEntry, HydratedGitBlobObject, HydratedGitCommitObject, HydratedGitTreeObject } from "./model"
import { analyzeRenamedFile, lookupFileInTree } from "./util.server"
import { GitCaller } from "./git-caller.server"
import { getCoAuthors } from "./coauthors.server"
import { log } from "./log.server"
import { gitLogRegex, contribRegex } from "./constants"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Worker } = require("worker_threads")

const renamedFiles = new Map<string, string>()

export async function hydrateData(commit: GitCommitObject): Promise<[HydratedGitCommitObject, string[], Record<string, GitLogEntry>]> {
  const authors = new Set<string>()
  const data = commit as HydratedGitCommitObject
  const commits: Record<string, GitLogEntry> = {}
  const worker = new Worker("./src/analyzer/backgroundable/worker.tsx", { workerData: "Dawid" })

  initially_mut(data)

  const gitLogResult = await GitCaller.getInstance().gitLog()
  const matches = gitLogResult.matchAll(gitLogRegex)
  for (const match of matches) {
    const groups = match.groups ?? {}
    const author = groups.author
    const time = Number(groups.date)
    const body = groups.body
    const message = groups.message
    const hash = groups.hash
    commits[hash] =  {author, time, body, message, hash}
    const contributionsString = groups.contributions
    const coauthors = body ? getCoAuthors(body) : []

    log.debug(`Checking commit from ${time}`)

    authors.add(author)
    coauthors.forEach((coauthor) => authors.add(coauthor.name))

    const contribMatches = contributionsString.matchAll(contribRegex)
    for (const contribMatch of contribMatches) {
      const file = contribMatch.groups?.file.trim()
      const isBinary = contribMatch.groups?.bin !== undefined
      if (!file) throw Error("file not found")

      const hasBeenMoved = file.includes("=>")

      let filePath = file
      if (hasBeenMoved) {
        filePath = analyzeRenamedFile(filePath, renamedFiles)
      }

      const newestPath = renamedFiles.get(filePath) ?? filePath

      const contribs = Number(contribMatch.groups?.contribs)
      if (contribs < 1) continue
      const blob = lookupFileInTree(data.tree, newestPath) as HydratedGitBlobObject
      if (!blob) {
        continue
      }
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
    }
  }

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
