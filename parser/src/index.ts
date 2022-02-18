import "dotenv/config"
import { hydrateTreeWithAuthorship } from "./hydrate.js"
import { log } from "./log.js"
import { findBranchHead, parseCommit } from "./parse.js"
import { getCurrentBranch, getRepoName, writeRepoToFile } from "./util.js"

if (process.argv.length < 3) {
  console.log(
    "Usage: [path to git repository = .] [outDir = .] [outFileName = {repo}_{branch}.json] [branch = main]"
  )
  process.exit(0)
}

const repoDir = process.argv.length < 3 ? "." : process.argv[2]
const outDir = process.argv.length < 4 ? "." : process.argv[4]
const branch = process.argv.length < 6 ? await getCurrentBranch(repoDir) : process.argv[3]
const outFileName = process.argv.length < 5 ? `${getRepoName(repoDir)}_${branch}.json` : process.argv[5]

try {
  const branchHead = await findBranchHead(repoDir, branch)
  let repoTree = await parseCommit(repoDir, branchHead)
  repoTree = await hydrateTreeWithAuthorship(repoDir, repoTree)
  await writeRepoToFile(repoTree, outDir, outFileName)
} catch (e) {
  log.error(e)
}
