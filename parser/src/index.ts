import "dotenv/config"
import { createSpinner } from "nanospinner"
import { resolve } from "path"
import { performance } from "perf_hooks"
import yargsParser from "yargs-parser"
import { hydrateTreeWithAuthorship } from "./hydrate.js"
import { getLogLevel, log, LOG_LEVEL } from "./log.js"
import { findBranchHead, parseCommit } from "./parse.js"
import { formatMs, getRepoName, writeRepoToFile } from "./util.js"

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
const spinner =
  getLogLevel() <= LOG_LEVEL.INFO
    ? createSpinner("", {
        interval: 1000/20,
        frames: [
          "                   🚛",
          "                  🚛 ",
          "                 🚛  ",
          "                🚛   ",
          "               🚛    ",
          "              🚛     ",
          "             🚛      ",
          "            🚛       ",
          "           🚛        ",
          "          🚛         ",
          "         🚛          ",
          "        🚛           ",
          "       🚛            ",
          "      🚛             ",
          "     🚛              ",
          "    🚛               ",
          "   🚛                ",
          "  🚛                 ",
          " 🚛                  ",
          "🚛                   ",
        ],
      })
    : null

async function describeAsyncJob<T>(
  job: () => Promise<T>,
  beforeMsg: string,
  afterMsg: string,
  errorMsg: string
) {

    let success = (text: string, final = false) => {
      if (getLogLevel() === LOG_LEVEL.SILENT) return
      if (spinner === null) return log.info(text)
      spinner.success({ text })
      if (!final) spinner.start()
    }
    let error = (text: string) =>
      spinner === null ? log.error(text) : spinner.error({ text })

    spinner?.start({ text: beforeMsg })
    try {
      const startTime = performance.now()
      const result = await job()
      const stopTime = performance.now()
      const suffix = `[${formatMs(stopTime - startTime)}]`
      success(`${afterMsg} ${suffix}`, true)
      return result
    } catch(e) {
        error(errorMsg)
        log.error(e)
        process.exit(1)
      }
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
