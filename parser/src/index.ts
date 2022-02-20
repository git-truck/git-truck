import "dotenv/config"
import { resolve } from "path"
import { performance } from "perf_hooks"
import yargsParser from "yargs-parser"
import { hydrateTreeWithAuthorship } from "./hydrate.js"
import { log } from "./log.js"
import { findBranchHead, parseCommit } from "./parse.js"
import { describeAsyncJob, formatMs, getRepoName, writeRepoToFile } from "./util.js"

const rawRargs = process.argv.slice(2)

const args = yargsParser(rawRargs)

if (args.help || args.h) {
  console.log(`Git Visual

Usage: npm run start <args>

Options:
  --path <path to git repository> (default: current directory)
  --out <output path for json file> (default: ./.temp/{repo}_{branch}.json)
  --branch <branch name> (default: current branch)
  --help, -h: Show this help message`)
  process.exit(0)
}

const repoDir = args.path ?? "."
let branch = args.branch ?? null

const start = performance.now()
const [branchHead, branchName] = await describeAsyncJob(
  () => findBranchHead(repoDir, branch),
  "Finding branch head",
  "Found branch head",
  "Error finding branch head"
)
const outFileName =
  args.out ?? `./.temp/${getRepoName(repoDir)}_${branchName}.json`
let repoTree = await describeAsyncJob(
  () => parseCommit(repoDir, branchHead),
  "Parsing commit tree",
  "Commit tree parsed",
  "Error parsing commit tree"
)
repoTree = await describeAsyncJob(
  () => hydrateTreeWithAuthorship(repoDir, repoTree),
  "Hydrating commit tree with authorship data",
  "Commit tree hydrated",
  "Error hydrating commit tree"
)
await describeAsyncJob(
  () => writeRepoToFile(repoTree, repoDir, outFileName),
  "Writing data to file",
  `Wrote data to ${resolve(outFileName)}`,
  `Error writing data to file ${outFileName}`
)
const stop = performance.now()

log.log(`\nDone in ${formatMs(stop - start)}`)
