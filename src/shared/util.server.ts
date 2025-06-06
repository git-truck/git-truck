import c from "ansi-colors"
import { createSpinner } from "nanospinner"
import { exec, spawn } from "node:child_process"
import { readdir } from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { getLogLevel, log, LOG_LEVEL } from "../analyzer/log.server"
import type { ArgsOptions, Repository } from "./model"
import { existsSync } from "node:fs"
import ServerInstance from "../analyzer/ServerInstance.server"
import { formatMs, promiseHelper } from "~/shared/util"
import yargsParser from "yargs-parser"
import { GitCaller } from "../analyzer/git-caller.server"
import { sep } from "path/posix"

export function runProcess(
  dir: string,
  command: string,
  args: string[],
  serverInstance?: ServerInstance,
  index?: number
) {
  log.debug(`exec ${dir} $ ${command} ${args.join(" ")}`)
  return new Promise((resolve, reject) => {
    try {
      const prcs = spawn(command, args, { cwd: path.resolve(dir) })
      const chunks: Uint8Array[] = []
      const errorHandler = (buf: Error): void => reject(buf.toString().trim())
      prcs.once("error", errorHandler)
      prcs.stderr.once("data", errorHandler)
      prcs.stdout.on("data", (buf) => {
        chunks.push(buf)
        if (serverInstance && index !== undefined) serverInstance.updateProgress(index)
      })
      prcs.stdout.on("end", () => {
        resolve(Buffer.concat(chunks).toString().trim())
      })
    } catch (e) {
      log.error(e as Error)
      reject(e)
    }
  })
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
  return getLogLevel() === null ? createSpinner("", { interval: 1000 / 20, frames: generateTruckFrames(20) }) : null
}

type Spinner = ReturnType<typeof createSpinner>
let spinner: null | Spinner = null

/**
 * This function is a wrapper around a job that provides a spinner and logs the result of the job.
 * @returns
 */
export async function describeAsyncJob<T>({
  /**
   * The job to run
   */
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
      spinner.update({ text, frames: generateTruckFrames(text.length) })
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

function getCommandLine() {
  switch (process.platform) {
    case "darwin":
      return "open" // MacOS
    case "win32":
      return 'start ""' // Windows
    default:
      return "xdg-open" // Linux
  }
}

export function openFile(repoDir: string, repoPath: string) {
  repoPath = path.resolve(repoDir, "..", repoPath.split("/").join("/"))
  const command = `${getCommandLine()} "${repoPath}"`
  exec(command).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${path.resolve(repoDir, repoPath)}: ${e}`)
  })
}

let latestVersion: string | null = null

export async function getLatestVersion() {
  if (!latestVersion) {
    const [result] = await promiseHelper(
      fetch("https://registry.npmjs.org/-/package/git-truck/dist-tags")
        .then((res) => res.json() as Promise<{ latest: string }>)
        .then((pkg) => pkg.latest)
    )
    latestVersion = result
  }

  return latestVersion
}

export const readGitRepos: (baseDir: string) => Promise<Repository[]> = async (baseDir) => {
  const entries = await readdir(baseDir, { withFileTypes: true })

  // Get all directories that has a .git subdirectory
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(baseDir, entry.name)) &&
        !entry.name.startsWith(".") &&
        // TODO: Implement browsing, requires new routing
        existsSync(path.join(baseDir, entry.name, ".git"))
    )
    .map(({ name }) => ({ name, path: path.join(baseDir, name), parentDirPath: baseDir, status: "Loading" }))
}

export const isPathGitRepo = (repoPath: string) => existsSync(path.join(repoPath, ".git"))

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false
    }
  })
}

export function getArgsWithDefaults(): ArgsOptions {
  const args = parseArgs()
  const tempArgs = {
    path: ".",
    ...args
  }

  return tempArgs
}

export async function getArgs(): Promise<ArgsOptions> {
  const args = getArgsWithDefaults()

  const pathIsRepo = await GitCaller.isGitRepo(args.path)
  args.path = pathIsRepo ? getBaseDirFromPath(args.path) : args.path

  return args
}
export const getBaseDirFromPath = (repoPath: string) => path.resolve(repoPath, "..")
export const getRepoNameFromPath = (repoPath: string) => path.resolve(repoPath).split(sep).reverse()[0]
export const getSiblingRepository = (repoPath: string, repo: string) => path.resolve(getBaseDirFromPath(repoPath), repo)
export function getDirName(dir: string) {
  return path.basename(dir)
}
