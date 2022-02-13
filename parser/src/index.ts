import "dotenv/config"
import { findBranchHead, parseCommit } from "./parse.js"
import { writeRepoToFile } from "./util.js"

if (process.argv.length < 3) {
  console.log(
    "Usage: [path to git repository = .] [branch = main] [outDir = .]"
  )
  process.exit(0)
}

const repoDir = process.argv.length < 3 ? "." : process.argv[2]
const branch = process.argv.length < 4 ? getCurrentBranch() : process.argv[3]
const outDir = process.argv.length < 5 ? "." : process.argv[4]

try {
  const branchHead = await findBranchHead(repoDir, branch)
  const parsedCommit = await parseCommit(branchHead)
  await writeRepoToFile(parsedCommit, repoDir, branch, outDir)
} catch (e) {
  console.error(e)
}

function getCurrentBranch() {
  // TODO: Determine current branch
  return "main"
}
