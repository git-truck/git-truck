import { findBranchHead } from "./parse-tree.js"


if (process.argv.length < 3) {
  console.log("Usage: <path to git repository> [branch=main]")
  process.exit(0)
}

const dir = process.argv[2]
const branch = process.argv.length < 4 ? "main" : process.argv[3]
const result = await findBranchHead(dir, branch)
console.log(result);

