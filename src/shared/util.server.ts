import c from "ansi-colors"
import { createSpinner } from "nanospinner"
import { exec, spawn } from "node:child_process"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { getLogLevel, log, LOG_LEVEL } from "~/server/log"
import type { ArgsOptions } from "~/shared/model"
import AnalyzationInstance from "~/server/AnalyzationInstance"
import { formatMs, invariant, normalizePath, promiseHelper } from "~/shared/util.ts"
import yargsParser from "yargs-parser"

export function runProcess(
  dir: string,
  command: string,
  args: string[],
  serverInstance?: AnalyzationInstance,
  index?: number
) {
  log.debug(`exec ${dir} $ ${command} ${args.join(" ")}`)

  // Capture original JS stack
  const originalError = new Error("Command failed: " + command + " " + args.join(" "))

  return new Promise<string>((resolve, reject) => {
    const cwd = path.resolve(dir)
    const prcs = spawn(command, args, { cwd })

    const out: Buffer[] = []
    const err: Buffer[] = []

    prcs.on("error", (e) => {
      originalError.message += `\nFailed to start process: ${e.message}`
      reject(originalError)
    })

    prcs.stdout.on("data", (b) => {
      out.push(b)
      if (serverInstance && index !== undefined) serverInstance.updateProgress(index)
    })

    prcs.stderr.on("data", (b) => err.push(b))

    prcs.on("close", (code) => {
      const stdout = Buffer.concat(out).toString().trim()
      const stderr = Buffer.concat(err).toString().trim()

      if (code === 0) {
        resolve(stdout)
        return
      }

      originalError.message =
        `Command failed: ${command} ${args.join(" ")}\n` + `cwd: ${cwd}\n\n${stderr || `Exited with code ${code}`}`
      reject(originalError)
    })
  })
}

function generateTruckFrames(length: number) {
  const frames = []
  for (let i = 0; i < length; i++) {
    const prefix = " ".repeat(length - i - 1)
    const frame = `${prefix}🚛\n`
    frames.push(frame)
  }
  return frames
}

function createTruckSpinner() {
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

  const outputError = (text: Error) => (spinner === null ? log.error(text) : spinner.error({ text: text.message }))

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
  } catch (err) {
    const error = new Error(errorMsg, {
      cause: err
    })
    outputError(error)
    return [null, error]
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

export function openFile(repositoryDir: string, filePath: string) {
  invariant(
    filePath.startsWith(getRepoNameFromPath(repositoryDir)),
    "Can only open files within the repository directory"
  )
  filePath = path.resolve(repositoryDir, "..", filePath)
  const command = `${getCommandLine()} "${filePath}"`
  exec(command).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${path.resolve(repositoryDir, filePath)}: ${e}`)
  })
}

let latestVersion: string | null = null

export async function getLatestVersion() {
  if (!latestVersion) {
    log.info("Fetching latest version from npm registry...")
    const [result] = await promiseHelper(
      fetch("https://registry.npmjs.org/-/package/git-truck/dist-tags")
        .then((res) => res.json() as Promise<{ latest: string }>)
        .then((pkg) => pkg.latest)
    )
    latestVersion = result
  }

  return latestVersion
}

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false
    }
  })
}

export function getArgsWithDefaults(): ArgsOptions {
  const cwd = process.cwd()
  const args = parseArgs()
  const tempArgs = {
    path: cwd,
    ...args
  }

  return tempArgs
}
export const getBaseDirFromPath = (repositoryPath: string) => normalizeAndResolvePath(path.dirname(repositoryPath))
export const getRepoNameFromPath = (repositoryPath: string) => {
  const resolvedPath = path.resolve(repositoryPath)
  return path.basename(resolvedPath) || resolvedPath
}

/**
 * Normalize a path to always use forward slashes and resolves relative segments
 * @
 */
export function normalizeAndResolvePath(p: string): string {
  const resolved = path.resolve(p)
  return normalizePath(resolved)
}
