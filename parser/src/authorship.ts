import { debugLog } from "./debug.js"
import { GitCommitObject, GitTreeObject } from "./model.js"
import { parseCommit } from "./parse.js"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util.js"

export async function hydrateTreeWithAuthorship(
  repo: string,
  originalTree: GitTreeObject,
  commit: GitCommitObject
) {
  let { hash: child, parent } = commit

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (parent === undefined) {
      // We have reached the root of the tree, so we are done
      return { ...commit, tree: originalTree }
    }

    let parentCommit = await parseCommit(repo, parent)
    if (parentCommit.parent2 !== undefined) {
      // TODO: Handle merges
    }
    let { author, ...restof } = parentCommit
    debugLog(
      `[${restof.message.split("\n").filter((x) => x.trim().length > 0)[0]}]`
    )
    // Diff newer with current
    debugLog(`comparing [${child}] -> [${parent}]`)

    let results = await gitDiffNumStatParsed(repo, child, parent)
    let numTimesCredited = 0

    for (const { pos, neg, file } of results) {
      const blob = await lookupFileInTree(originalTree, file)
      if (file === "dev/null") continue
      if (blob) {
        numTimesCredited++
        let current = blob.authors[author.name] ?? 0
        blob.authors[author.name] = current + pos + neg
        // Log out the authorship
        debugLog(
          `${file} ${blob.authors[author.name]} (${
            author.name
          } +${pos} -${neg})`
        )
      } else {
        debugger
      }
    }
    if (numTimesCredited === 0) {
      console.error("[WARN] Commit has no authorship")
      debugger
    }
    child = parent
    parent = parentCommit.parent
  }
}
