import { emptyGitTree } from "./constants.js"
import { log } from "./log.js"
import { GitCommitObject, HydratedGitBlobObject, HydratedGitCommitObject } from "./model.js"
import { parseCommit, parseCommitLight } from "./parse.js"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util.js"

export async function hydrateTreeWithAuthorship(
  repo: string,
  commit: GitCommitObject
): Promise<HydratedGitCommitObject> {
  let hydratedCommit = commit as HydratedGitCommitObject
  let { hash: child, parent } = hydratedCommit

  let isDone = false
  while (!isDone) {
    if (parent === emptyGitTree) {
      // We have reached the root of the tree, so we need to compare the initial commit to the empty git tree
      isDone = true
    }

    let childCommit = await parseCommitLight(repo, child)
    if (childCommit.parent2 !== null) {
      // TODO: Handle merges
    }
    let { author, ...restof } = childCommit
    log.debug(
      `[${restof.message.split("\n").filter((x) => x.trim().length > 0)[0]}]`
    )
    // Diff newer with current
    log.debug(`comparing [${child}] -> [${parent}]`)

    let results = await gitDiffNumStatParsed(repo, child, parent)
    let numTimesCredited = 0

    for (const { pos, neg, file } of results) {
      let blob = await lookupFileInTree(hydratedCommit.tree, file)
      if (file === "dev/null") continue
      if (blob) {
        numTimesCredited++
        let hydratedBlob = {
          ...blob,
          authors: (blob as HydratedGitBlobObject).authors ?? {},
          noLines: blob.content.split("\n").length
        } as HydratedGitBlobObject

        let current = hydratedBlob.authors[author.name] ?? 0

        for (let coauthor of childCommit.coauthors) {
          hydratedBlob.authors[coauthor.name] = current + pos + neg
        }

        hydratedBlob.authors[author.name] = current + pos + neg
        // Log out the authorship
        log.debug(
          `${file} ${hydratedBlob.authors[author.name]} (${author.name
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

  return hydratedCommit
}
