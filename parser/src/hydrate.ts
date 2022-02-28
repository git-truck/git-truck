import { isText } from "istextorbinary"
import { emptyGitTree } from "./constants"
import { log } from "./log"
import {
  GitCommitObject,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
} from "./model"
import { parseCommitLight } from "./parse"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util"

export async function hydrateTreeWithAuthorship(
  repo: string,
  commit: GitCommitObject
): Promise<HydratedGitCommitObject> {
  const hydratedCommit = {
    ...commit,
    minNoCommits: Number.MAX_VALUE,
    maxNoCommits: Number.MIN_VALUE,
  } as HydratedGitCommitObject
  let { hash: child, parent } = hydratedCommit

  addAuthorsField(hydratedCommit.tree)

  let isDone = false
  while (!isDone) {
    if (parent === emptyGitTree) {
      // We have reached the root of the tree, so we need to compare the initial commit to the empty git tree
      isDone = true
    }

    const childCommit = await parseCommitLight(repo, child)
    if (childCommit.parent2 !== null) {
      // TODO: Handle merges
    }
    const { author, ...restof } = childCommit
    log.debug(
      `[${restof.message.split("\n").filter((x) => x.trim().length > 0)[0]}]`
    )
    // Diff newer with current
    log.debug(`comparing [${child}] -> [${parent}]`)

    const results = await gitDiffNumStatParsed(repo, child, parent)
    let numTimesCredited = 0

    for (const { pos, neg, file } of results) {
      const blob = await lookupFileInTree(hydratedCommit.tree, file)
      if (file === "dev/null" || !isText(blob?.name)) continue
      if (blob) {
        numTimesCredited++
        const noCommits = 1 + ((blob as HydratedGitBlobObject).noCommits ?? 0)
        if (noCommits < hydratedCommit.minNoCommits)
          hydratedCommit.minNoCommits = noCommits
        if (noCommits > hydratedCommit.maxNoCommits)
          hydratedCommit.maxNoCommits = noCommits
        const hydratedBlob = {
          ...blob,
          authors: (blob as HydratedGitBlobObject).authors ?? {},
          noLines: blob.content.split("\n").length,
          noCommits: noCommits,
        } as HydratedGitBlobObject

        const current = hydratedBlob.authors?.[author.name] ?? 0

        for (const coauthor of childCommit.coauthors) {
          hydratedBlob.authors[coauthor.name] = current + pos + neg
        }

        hydratedBlob.authors[author.name] = current + pos + neg
        // Log out the authorship
        log.debug(
          `${file} ${hydratedBlob.authors[author.name]} (${
            author.name
          } +${pos} -${neg})`
        )
        Object.assign(blob, hydratedBlob)
      }
    }
    if (numTimesCredited === 0) {
      log.debug("Commit has no authorship (file probably does no longer exist)")
    }
    if (!isDone) {
      child = parent
      parent = (await parseCommitLight(repo, childCommit.parent)).parent
    }
  }
  discardContentField(hydratedCommit.tree)

  return hydratedCommit
}

function addAuthorsField(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.authors = {}
    } else {
      addAuthorsField(child)
    }
  }
}

function discardContentField(tree: HydratedGitTreeObject) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.content = ""
    } else {
      discardContentField(child)
    }
  }
}
