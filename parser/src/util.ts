import { spawn } from "child_process"
import { existsSync, promises as fs } from "fs"
import { createSpinner } from "nanospinner"
import { dirname, join, resolve, sep } from "path"
import { getLogLevel, log, LOG_LEVEL } from "./log.js"
import { GitBlobObject, GitCommitObject, GitTreeObject } from "./model.js"

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

export function runProcess(dir: string, command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    try {
      const prcs = spawn(command, args, {
        cwd: dir,
      })
      prcs.stderr.once("data", buf => reject(buf.toString().trim()))
      prcs.stdout.once("data", buf => resolve(buf.toString().trim()))
    } catch(e) {
      reject(e)
    }
  })
}

export async function gitDiffNumStatParsed(repo: string, a: string, b: string) {
  let diff = await gitDiffNumStat(repo, a, b)
  let entries = diff.split("\n")
  let stuff = entries
    .filter((x) => x.trim().length > 0)
    .map((x) => x.split(/\t+/))
    .map(([neg, pos, file]) => ({
      neg: parseInt(neg),
      pos: parseInt(pos),
      file,
    }))
  return stuff
}

export async function lookupFileInTree(
  tree: GitTreeObject,
  path: string
): Promise<GitBlobObject | undefined> {
  let dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find(
      (x) => x.name === file && x.type === "blob"
    )
    if (!result) return
    if (result.type === "tree") return undefined
    return result
  }
  let subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return await lookupFileInTree(subtree, dirs.slice(1).join("/"))
}

export async function gitDiffNumStat(repoDir: string, a: string, b: string) {
  const result = await runProcess(repoDir, "git", ["diff", "--numstat", a, b])
  return result as string
}

export async function deflateGitObject(repo: string, hash: string) {
  const result = await runProcess(repo, "git", ["cat-file", "-p", hash])
  return result as string
}

export async function writeRepoToFile(
  commitObject: GitCommitObject,
  repoDir: string,
  outFileName: string
) {
  const data = JSON.stringify(commitObject, null, 2)
  let outPath = join(repoDir, outFileName)
  let dir = dirname(outPath)
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true })
  }
  await fs.writeFile(outPath, data)
  return outPath
}

export function getRepoName(repoDir: string) {
  return resolve(repoDir).split(sep).slice().reverse()[0]
}

export async function getCurrentBranch(dir: string) {
  const result = (await runProcess(dir, "git", [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ])) as string
  return result.trim()
}

export const formatMs = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

export function createTruckSpinner() {
  return getLogLevel() <= LOG_LEVEL.INFO
    ? createSpinner("", {
      interval: 1000 / 20,
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
}

const spinner = createTruckSpinner()

export async function describeAsyncJob<T>(
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

