import { spawn } from "child_process"
import { existsSync, promises as fs } from "fs"
import { createSpinner, Spinner } from "nanospinner"
import { dirname, resolve, sep } from "path"
import { getLogLevel, log, LOG_LEVEL } from "./log.server"
import { GitBlobObject, GitTreeObject, AnalyzerData } from "./model"
import { performance } from "perf_hooks"

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

function runProcess(dir: string, command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    try {
      const prcs = spawn(command, args, {
        cwd: dir,
      })
      const chunks: Uint8Array[] = []
      prcs.stderr.once("data", (buf) => reject(buf.toString().trim()))
      prcs.stdout.on("data", (buf) => chunks.push(buf))
      prcs.stdout.on("end", () => {
        resolve(Buffer.concat(chunks).toString().trim())
      })
    } catch (e) {
      reject(e)
    }
  })
}

export async function gitDiffNumStatAnalyzed(
  repo: string,
  a: string,
  b: string,
  renamedFiles: Map<string, string>
) {
  const diff = await gitDiffNumStat(repo, a, b)
  const entries = diff.split("\n")
  const stuff = entries
    .filter((x) => x.trim().length > 0)
    .map((x) => x.split(/\t+/))
    .map(([neg, pos, file]) => {
      let filePath = file
      const hasBeenMoved = file.includes("=>")
      if (hasBeenMoved) {
        filePath = analyzeRenamedFile(filePath, renamedFiles)
      }

      const newestPath = renamedFiles.get(filePath) ?? filePath

      return {
        neg: parseInt(neg),
        pos: parseInt(pos),
        file: newestPath,
      }
    })
  return stuff
}

function analyzeRenamedFile(file: string, renamedFiles: Map<string, string>) {
  const movedFileRegex =
    /(?:.*{(?<oldPath>.*)\s=>\s(?<newPath>.*)}.*)|(?:^(?<oldPath2>.*) => (?<newPath2>.*))$/gm
  const replaceRegex = /{.*}/gm
  const match = movedFileRegex.exec(file)
  const groups = match?.groups ?? {}

  let oldPath: string
  let newPath: string

  if (groups["oldPath"] || groups["newPath"]) {
    const oldP = groups["oldPath"] ?? ""
    const newP = groups["newPath"] ?? ""
    oldPath = file.replace(replaceRegex, oldP).replace("//", "/")
    newPath = file.replace(replaceRegex, newP).replace("//", "/")
  } else {
    oldPath = groups["oldPath2"] ?? ""
    newPath = groups["newPath2"] ?? ""
  }

  const newest = renamedFiles.get(newPath) ?? newPath
  renamedFiles.delete(newPath)
  renamedFiles.set(oldPath, newest)
  return newPath
}

export async function lookupFileInTree(
  tree: GitTreeObject,
  path: string
): Promise<GitBlobObject | undefined> {
  const dirs = path.split("/")

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
  const subtree = tree.children.find((x) => x.name === dirs[0])
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

export async function getDefaultGitSettingValue(repoDir: string, setting: string) {
  const result = await runProcess(repoDir, "git", ["config", setting])
  return result as string
}

export async function resetGitSetting(repoDir: string, settingToReset: string, value: string, ) {
  if (!value) {
    await runProcess(repoDir, "git", ["config", "--unset", settingToReset])
    log.debug(`Unset ${settingToReset}`)
  } else {
    await runProcess(repoDir, "git", ["config", settingToReset, value])
    log.debug(`Reset ${settingToReset} to ${value}`)
  } 
}

export async function setGitSetting(repoDir: string, setting: string, value: string) {
  await runProcess(repoDir, "git", ["config", setting, value])
  log.debug(`Set ${setting} to ${value}`)
}

export async function writeRepoToFile(outPath: string, analyzedData: AnalyzerData) {
  const data = JSON.stringify(analyzedData, null, 2)
  const dir = dirname(outPath)
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

export function generateTruckFrames(length: number) {
  const frames = []
  for (let i = 0; i < length; i++) {
    const prefix = " ".repeat(length - i - 1)
    const frame = `${prefix}🚛\n`
    frames.push(frame)
  }
  return frames
}

export function createTruckSpinner() {
  return getLogLevel() === null
    ? createSpinner("", {
        interval: 1000 / 20,
        frames: generateTruckFrames(20),
      })
    : null
}

let spinner: null | Spinner = null

export async function describeAsyncJob<T>(
  job: () => Promise<T>,
  beforeMsg: string,
  afterMsg: string,
  errorMsg: string
) {
  spinner = createTruckSpinner()
  const success = (text: string, final = false) => {
    if (getLogLevel() === LOG_LEVEL.SILENT) return
    if (spinner === null) return log.info(text)
    spinner.success({ text })
    if (!final) spinner.start()
  }
  const output = (text: string) => {
    if (spinner) {
      spinner.update({
        text,
        frames: generateTruckFrames(text.length),
      })
      spinner.start()
    } else log.info(text)
  }

  const error = (text: string) =>
    spinner === null ? log.error(text) : spinner.error({ text })

  output(beforeMsg)
  try {
    const startTime = performance.now()
    const result = await job()
    const stopTime = performance.now()
    const suffix = `[${formatMs(stopTime - startTime)}]`
    success(`${afterMsg} ${suffix}`, true)
    return result
  } catch (e) {
    error(errorMsg)
    log.error(e as Error)
    process.exit(1)
  }
}
