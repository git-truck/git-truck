import "dotenv/config"
import { hydrateTreeWithAuthorship } from "./hydrate.js"
import { log } from "./log.js"
import { findBranchHead, parseCommit } from "./parse.js"
import { getCurrentBranch, getRepoName, writeRepoToFile } from "./util.js"

if (process.argv[2] === "--help") {
  console.log(
    "Usage: " +
    "[path to git repository = .] " +
    "[branch = main]" +
    "[outFileName = ./.temp/{repo}_{branch}.json] "
  )
  process.exit(0)
}

const repoDir = process.argv.length < 3 ? "." : process.argv[2]
const branch = process.argv.length < 4 ? await getCurrentBranch(repoDir) : process.argv[3]
const outFileName = process.argv.length < 5 ? `./.temp/${getRepoName(repoDir)}_${branch}.json` : process.argv[4]


try {
  const branchHead = await findBranchHead(repoDir, branch)
  let repoTree = await parseCommit(repoDir, branchHead)
  repoTree = await hydrateTreeWithAuthorship(repoDir, repoTree)
  await writeRepoToFile(repoTree, repoDir, outFileName)
} catch (e) {
  log.error(e)
}
