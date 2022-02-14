import { debugLog } from "./debug.js"
import { GitCommitObject } from "./model.js"
import { parseCommitLight } from "./parse.js"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util.js"

export async function hydrateTreeWithAuthorship(commit: GitCommitObject) {
  let { hash: child, parent, author, tree, ...rest } = commit
  console.log(`hydrating [${rest.message}]`)
  let i = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (i % 10 === 0) {
      console.log(child);

      console.log(i)
    }
    i++
    if (parent === undefined) {
      // We have reached the root of the tree, so we are done
      return { hash: child, parent, author, tree, ...rest }
    }
    let parentCommit = await parseCommitLight(parent)

    // Diff newer with current
    debugLog(`comparing [${child}] -> [${parent}]`)

    let results = await gitDiffNumStatParsed(child, parent)

    for (const { pos, neg, file } of results) {
      const blob = await lookupFileInTree(tree, file)
      if (file === "dev/null") continue
      if (blob) {
        let current = blob.authors[author.name] ?? 0
        blob.authors[author.name] = current + pos + neg
        console.log(blob.authors[author.name])
      }
    }
    child = parent
    parent = parentCommit.parent
  }
}
