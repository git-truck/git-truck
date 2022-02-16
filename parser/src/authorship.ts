import { emptyGitTree } from "./constants.js"
import { log } from "./log.js"
import { GitCommitObject } from "./model.js"
import { parseCommit, parseCommitLight } from "./parse.js"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util.js"

export async function hydrateTreeWithAuthorship(
  repo: string,
  commit: GitCommitObject
) {
  let { hash: child, parent } = commit

  let isDone = false
  while (!isDone) {
    if (parent === emptyGitTree) {
      // We have reached the root of the tree, so we need to compare the initial commit to the empty git tree
      isDone = true
    }

    let childCommit = await parseCommit(repo, child)
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
      const blob = await lookupFileInTree(commit.tree, file)
      if (file === "dev/null") continue
      if (blob) {
        numTimesCredited++
        let current = blob.authors[author.name] ?? 0
        blob.authors[author.name] = current + pos + neg
        // Log out the authorship
        log.debug(
          `${file} ${blob.authors[author.name]} (${
            author.name
          } +${pos} -${neg})`
        )
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

  return commit
}
