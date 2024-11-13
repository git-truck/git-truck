import c from "ansi-colors"
import { createSpinner } from "nanospinner"
import { exec, spawn } from "node:child_process"
import { readdir } from "node:fs/promises"
import { join, resolve, sep } from "node:path"
import { performance } from "node:perf_hooks"
import { getLogLevel, log, LOG_LEVEL } from "./log"
import type { GitObject, GitTreeObject, Repository } from "./model"
import { existsSync } from "node:fs"
import { GitCaller } from "./git-caller.server"

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

export function runProcess(
  dir: string,
  command: string,
  args: string[],
  // serverInstance?: ServerInstance,
  // index?: number
) {
  log.debug(`exec ${dir} $ ${command} ${args.join(" ")}`)
  return new Promise((resolve, reject) => {
    try {
      const prcs = spawn(command, args, {
        cwd: resolve(dir)
      })
      const chunks: Uint8Array[] = []
      const errorHandler = (buf: Error): void => reject(buf.toString().trim())
      prcs.once("error", errorHandler)
      prcs.stderr.once("data", errorHandler)
      prcs.stdout.on("data", (buf) => {
        chunks.push(buf)
        // if (serverInstance && index !== undefined) serverInstance.updateProgress(index)
      })
      prcs.stdout.on("end", () => {
        resolve(Buffer.concat(chunks).toString().trim())
      })
    } catch (e) {
      reject(e)
    }
  })
}

export function lookupFileInTree(tree: GitTreeObject, path: string): GitObject | undefined {
  const dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find((x) => x.name === file && x.type === "blob")
    if (!result) return
    return result
  }
  const subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return lookupFileInTree(subtree, dirs.slice(1).join("/"))
}

export function getDirName(dir: string) {
  return resolve(dir).split(sep).slice().reverse()[0]
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
        frames: generateTruckFrames(20)
      })
    : null
}

type Spinner = ReturnType<typeof createSpinner>
let spinner: null | Spinner = null

export async function describeAsyncJob<T>({
  job = async () => null as T,
  beforeMsg = "",
  afterMsg = "",
  errorMsg = "",
  ms = null
}: {
  job: () => Promise<T>
  beforeMsg: string
  afterMsg: string
  errorMsg: string
  ms?: number | null
}): Promise<[T, null] | [null, Error]> {
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
        frames: generateTruckFrames(text.length)
      })
      spinner.start()
    } else log.info(text)
  }

  const error = (text: string) => (spinner === null ? log.error(text) : spinner.error({ text }))

  if (beforeMsg.length > 0) {
    output(beforeMsg)
  }
  try {
    const startTime = performance.now()
    const result = await job()
    const stopTime = performance.now()
    const suffix = c.gray(`${formatMs(!ms ? stopTime - startTime : ms)}`)
    success(`${afterMsg} ${suffix}`, true)
    return [result, null]
  } catch (e) {
    error(errorMsg)
    log.error(e as Error)
    return [null, e as Error]
  }
}

export const getBaseDirFromPath = (path: string) => resolve(path, "..")
export const getRepoNameFromPath = (path: string) => resolve(path).split(sep).reverse()[0]
export const getSiblingRepository = (path: string, repo: string) => resolve(getBaseDirFromPath(path), repo)

export function isValidURI(uri: string) {
  try {
    decodeURIComponent(uri)
    return true
  } catch (error) {
    return false
  }
}


function getCommandLine() {
  return "start"
  // switch (process.platform) {
  //   case "darwin":
  //     return "open" // MacOS
  //   case "win32":
  //     return 'start ""' // Windows
  //   default:
  //     return "xdg-open" // Linux
  // }
}

export function openFile(path: string) {
  path = resolve(path.split("/").join("/"))
  const command = `${getCommandLine()} "${path}"`
  exec(command).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${path}: ${e}`)
  })
}

export const readGitRepos: (baseDir: string) => Promise<Repository[]> = async (baseDir) => {
  const entries = await readdir(baseDir, { withFileTypes: true })

  // Get all directories that has a .git subdirectory
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(baseDir, entry.name)) &&
        !entry.name.startsWith(".") &&
        GitCaller.isGitRepo(resolve(baseDir, entry.name))
    )
    .map(({ name }) => ({ name, path: join(baseDir, name), parentDirPath: baseDir, status: "Loading" }))
}
