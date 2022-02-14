import { debugLog } from "./debug.js"
import { GitCommitObject } from "./model.js"
import { parseCommitLight } from "./parse.js"
import { gitDiffNumStatParsed, lookupFileInTree } from "./util.js"

export async function hydrateTreeWithAuthorship(commit: GitCommitObject) {
  let { hash: child, parent, author, tree, ...rest } = commit
  console.log(`hydrating [${rest.message.split("\n").filter(x => x.trim().length > 0)[0]}]`)
  // eslint-disable-next-line no-constant-condition
  while (true) {
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
        console.log(`Crediting ${blob.authors[author.name]} to ${author.name} for ${file}`)
      }
    }
    child = parent
    parent = parentCommit.parent
  }
}
