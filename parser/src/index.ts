import "dotenv/config"
import { findBranchHead, parseCommit } from "./parse.js"
import { writeRepoToFile } from "./util.js"

if (process.argv.length < 3) {
  console.log("Usage: <path to git repository> [branch=main] [outfile=.temp/{repo}{branch}.json")
  process.exit(0)
}

const dir = process.argv[2]
const branch = process.argv.length < 4 ? "main" : process.argv[3]
try {
  const branchHead = await findBranchHead(dir, branch)
  const parsedCommit = await parseCommit(branchHead)
  await process.argv.length < 5 ?
  writeRepoToFile(parsedCommit, dir, branch, process.argv[4]) :
  writeRepoToFile(parsedCommit, dir, branch, ".")
} catch (e) {
  console.error(e)
}
