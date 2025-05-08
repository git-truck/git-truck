import { catFile, GitCaller, lstree } from "~/analyzer/git-caller.server.js"
import { contribRegex, gitLogRegex } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"
import { compress } from "@mongodb-js/zstd"
import { mapAsync, printProgressBar } from "~/util.js"
import { log } from "~/analyzer/log.server"
import { getArgs } from "~/analyzer/args.server"
import { join, resolve } from "node:path"

const ignore = [
  "package-lock.json",
  "lock",
  "bun.lockb",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "ico",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "mp4",
  "mkv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "piskel",
  "gitignore",
  "db",
  "txt",
  "cfg",
]

const codeExtensions = [
  // System
  "c",
  "h",
  "cpp",
  "hpp",
  "cxx",
  "cc",
  "cs",
  "java",
  "go",
  "rs",
  "swift",
  "py",
  "rs",
  "test",
  "sh",

  "sql",

  // Web
  "mjs",
  "js",
  "jsx",
  "ts",
  "mts",
  "tsx",
  "html",
  "css",
  "scss",

  // Config etc
  "json",
  "yml",
  "yaml",
  "toml",

  // Docs
  "md"
]

const DEFAULT_COMMIT_COUNT = 100

export const loader = async (args: LoaderFunctionArgs) => {
  const basePath = (await getArgs()).path

  const { searchParams } = new URL(args.request.url)

  const repo =
    searchParams.get("repo") ??
    (() => {
      throw new Error("Repository parameter is required.")
    })()
  const branch = searchParams.get("branch") ?? "HEAD"
  const path = searchParams.get("path") ?? join(basePath, repo)
  const count = Number(searchParams.get("count") ?? DEFAULT_COMMIT_COUNT)
  const ext = searchParams.get("ext")?.split(",") ?? []

  const gitCaller = new GitCaller(repo, branch, path)
  log.warn(await gitCaller.gitRemote())

  // TODO: Since we are no longer accessing specific commits, but instead the history
  // after a specific revision, we can consolidate these two calls into one by removing "no-walk" argument
  const commitHashes = (await gitCaller.gitLogHashes(0, count)).split("\n")
  if (commitHashes.length !== count) {
    throw new Error(`Expected ${count} commits, but got ${commitHashes.length}.`)
  }
  const gitLog = await gitCaller.gitLogSpecificCommits(commitHashes)

  const results = gitLog.matchAll(gitLogRegex)
  const startTime = performance.now()
  let lastPrintTime = performance.now()

  const commits = await mapAsync(results, async (result, i, results) => {
    lastPrintTime = printProgressBar(results, i, lastPrintTime, startTime)
    const {
      hash: commitHash,
      dateauthor: date,
      message,
      contributions
    } = result.groups as {
      hash: string
      dateauthor: string
      message: string
      contributions: string
    }
    const contributionResults = contributions.matchAll(contribRegex)

    async function compressionDistanceComparedToRevision(targetRevision: string, baselineRevision: string) {
      const targetBuffer = Buffer.concat(await readCommitFileBuffers(targetRevision))
      const baselineBuffer = Buffer.concat(await readCommitFileBuffers(baselineRevision))

      const zCombined = (await compress(Buffer.concat([baselineBuffer, targetBuffer]))).length
      const zTarget = (await compress(targetBuffer)).length

      // CD(x) = |R_x R_f| - |R_x|, where R_x is the X’ed commit and R_f is the final commit. Now you get a size in bytes, which is a little easier to understand.
      return zCombined - zTarget
    }

    const cdFromLatest = await compressionDistanceComparedToRevision(commitHash, branch)
    const cdFromLatestPrev = await compressionDistanceComparedToRevision(`${commitHash}~1`, branch)
    const cdDelta = cdFromLatestPrev - cdFromLatest

    // const cdFromPrev = await cdComparedToRevision(commitHash, `${commitHash}~1`)
    // TODO: Investigate bug with incorrect insertions / deletions reported
    const [insertions, deletions] = Array.from(contributionResults)
      .map((c) => c.groups!)
      .reduce(
        ([ins, del], { file, insertions, deletions }) =>
          file.includes("=>") || ignore.some(i => file.endsWith(i) || !codeExtensions.some(ext => file.endsWith(`.${ext}`)))
            ? [ins, del]
            : [
                ins + (insertions === "-" ? 0 : parseInt(insertions)),
                del + (deletions === "-" ? 0 : parseInt(deletions))
              ],
        [0, 0]
      )

    return {
      i,
      commitHash,
      date,
      message,
      insertions,
      deletions,
      cdDelta
    }
  })

  const averageCDDelta = commits.reduce((acc, commit) => acc + commit.cdDelta, 0) / commits.length

  console.log(`Average CD Delta: ${averageCDDelta}`)

  return commits
    .map((d) =>
      Object.values(d)
        .map((x) => (typeof x === "number" ? x.toString().replace(".", ",") : x).replaceAll(";", "_"))
        .join(";")
    )
    .join("\n")

  async function readCommitFileBuffers(commit: string) {
    process.stdout.write("🟩")
    const fileList = await lstree(path, commit)

    const inherentExtensions = fileList.files
      .map((f) => f.fileName.split(".")?.at(-1)?.toLowerCase())
      .filter(Boolean) as string[]

    const extensionCount = inherentExtensions.reduce((acc, ext) => {
      acc.set(ext, (acc.get(ext) ?? 0) + 1)
      return acc
    }, new Map<string, number>())

    const extensionsToUse =
      ext.length > 0
        ? ext
        : Array.from(extensionCount.entries())
            .sort((a, b) => b[1] - a[1])
            // Only include files that has an extension use by at least 8% of all files
            .filter(([ext, count]) => {
              const extensionFrequency = count / fileList.files.length
              return extensionFrequency > 0.01
            })
            // Warn if a prevalent is found that is not specified as a code extension or ignore extension
            .map((entry) => {
              if (!codeExtensions.includes(entry[0]) && !ignore.some((ig) => entry[0].endsWith(ig))) {
                log.warn(`Extension ${entry[0]} is prevalent in commit ${commit.slice(7)}, but is not a code extension`)
              }
              return entry
            })
            // Only include extensions that are in the codeExtensions list
            .filter(([ext]) => codeExtensions.includes(ext) && !ignore.some((ig) => ig.endsWith(ext)))
            .map(([ext]) => ext)

    const filteredFiles = fileList.files.filter(
      (file) =>
        // Include files that are in the codeExtensions list
        extensionsToUse.some((ext) => file.fileName.endsWith(`.${ext}`)) &&
        // Exclude files that are in the ignore list
        !ignore.some((i) => file.fileName.endsWith(i))
    )

    const fileBuffers = (await mapAsync(filteredFiles, (f) => catFile(path, f.hash))) as Buffer[]

    return fileBuffers
  }
}
