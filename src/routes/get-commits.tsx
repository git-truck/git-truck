import { catFile, GitCaller, lstreeCached } from "~/analyzer/git-caller.server.js"
import { contribRegex, gitLogRegex, type gitLogRegexGroups } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"
import { compress } from "@mongodb-js/zstd"
import { mapAsync, printProgressBar } from "~/util.js"
import { log } from "~/analyzer/log.server"
import { getArgs } from "~/analyzer/args.server"
import { join, resolve } from "node:path"
import { csv, csvFormat, dsvFormat } from "d3"

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
  "pdf",
  "husky/pre-commit",
  "license",
  "truckignore",
  "prettierrc",
  "sln",
  "eslintignore"
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
  "http",

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
  "md",

  // Misc
  "tape"
]

const DEFAULT_COMMIT_COUNT = 100

export const loader = async (args: LoaderFunctionArgs) => {
  const basePath = (await getArgs()).path

  const { searchParams } = new URL(args.request.url)

  /** Repository to analyze. This is the name of the folder in the base path. */
  const repo =
    searchParams.get("repo") ??
    (() => {
      throw new Error("Repository parameter is required.")
    })()

  /** Revision to start from. Defaults to HEAD (currently checked out commit) */
  const revision = searchParams.get("branch") ?? "HEAD"
  /** Path to analyze. This is the path to the folder in the repository. Constructed automatically by default, but can be overridden if needed. */
  const path = searchParams.get("path") ?? join(basePath, repo)
  /** Count of commits to analyze. Defaults to 100. */
  const count = Number(searchParams.get("count") ?? DEFAULT_COMMIT_COUNT)
  /** Extensions to include in the analysis. Defaults to all code extensions. */
  const ext = searchParams.get("ext")?.split(",") ?? []

  const gitCaller = new GitCaller(repo, revision, path)

  const gitLog = await gitCaller.gitLog(0, count)
  log.warn(await gitCaller.gitRemote())

  const results = gitLog.matchAll(gitLogRegex)
  const startTime = performance.now()
  let lastPrintTime = performance.now()

  const baselineBuffer = Buffer.concat(await readCommitFileBuffers(revision))

  const commits = (
    await mapAsync(results, async (result, i, results) => {
      // if last commit, ignore

      if (i === results.length - 1) {
        return null
      }

      const commit: gitLogRegexGroups = result.groups as gitLogRegexGroups
      lastPrintTime = printProgressBar(results, i, lastPrintTime, startTime)

      const contributionResults = commit.contributions.matchAll(contribRegex)

      async function compDistComparedToCommit(targetCommit: string) {
        const targetBuffer = Buffer.concat(await readCommitFileBuffers(targetCommit))
        // const baselineBuffer = Buffer.concat(await readCommitFileBuffers(baselineRevision))

        const zCombined = (await compress(Buffer.concat([baselineBuffer, targetBuffer]))).length
        const zTarget = (await compress(targetBuffer)).length
        // CD(x) = |R_x R_f| - |R_x|, where R_x is the X’ed commit and R_f is the final commit. Now you get a size in bytes, which is a little easier to understand.

        return {
          dist: baselineBuffer.length - targetBuffer.length,
          compDist: zCombined - zTarget
        }
      }

      /**
       * Compression distance compared to the latest commit
       */
      const fromLatest = await compDistComparedToCommit(commit.hash)
      /**
       * Compression distance for previous commit compared to the latest commit
       */
      const fromLatestPrev = await compDistComparedToCommit(`${commit.hash}~1`)

      // TODO: Investigate bug with incorrect insertions / deletions reported
      const [insertions, deletions] = Array.from(contributionResults)
        .map((c) => c.groups!)
        .reduce(
          ([ins, del], { file, insertions, deletions }) =>
            file.includes("=>") ||
            ignore.some((i) => file.endsWith(i) || !codeExtensions.some((ext) => file.endsWith(`.${ext}`)))
              ? [ins, del]
              : [
                  ins + (insertions === "-" ? 0 : parseInt(insertions)),
                  del + (deletions === "-" ? 0 : parseInt(deletions))
                ],
          [0, 0]
        )

      return {
        i,
        hash: commit.hash,
        date: commit.dateauthor,
        author: commit.author,
        message: commit.message,
        insertions,
        deletions,
        locc: insertions + deletions,
        dist: fromLatest.dist,
        distDelta: fromLatestPrev.dist - fromLatest.dist,
        compDist: fromLatest.compDist,
        compDistDelta: fromLatestPrev.compDist - fromLatest.compDist
      }
    })
  ).filter(Boolean)

  const averageCDDelta = commits.reduce((acc, commit) => acc + commit.compDistDelta, 0) / commits.length

  const { totalDist, totalCompDist, totalLoCC, totalInsertions, totalDeletions, totalCommitCount } = Array.from(
    commits.values()
  ).reduce(
    (acc, c) => {
      acc.totalDist += c.distDelta
      acc.totalCompDist += c.compDistDelta
      acc.totalCommitCount += 1
      acc.totalLoCC += c.locc
      acc.totalInsertions += c.insertions
      acc.totalDeletions += c.deletions
      return acc
    },
    { totalDist: 0, totalCompDist: 0, totalLoCC: 0, totalInsertions: 0, totalDeletions: 0, totalCommitCount: 0 }
  )

  const authorMap = {
    "Thomas Hoffmann Kilbak": "Thomas",
    tjomson: "Thomas",
    joglr: "Jonas",
    "Thomas Kilbak": "Thomas",
    "Jonas Røssum": "Jonas",
    "Jonas Glerup Røssum": "Jonas",
    "vhs-action 📼": "Bot",
    "Automated Version Bump": "Bot"
  } as const

  const authorDistribution: Map<
    string,
    {
      dist: number
      count: number
      insertions: number
      deletions: number
      locc: number
      compDist: number
    }
  > = commits.reduce(
    (acc, commit) => {
      const author = authorMap[commit.author as keyof typeof authorMap] ?? commit.author
      const dist = commit.compDistDelta

      if (!acc.has(author)) {
        acc.set(author, { author, dist: 0, count: 0, insertions: 0, deletions: 0, locc: 0, compDist: 0 })
      }

      acc.get(author)!.count += 1 / totalCommitCount
      acc.get(author)!.dist += commit.distDelta / totalDist
      acc.get(author)!.compDist += commit.compDistDelta / totalCompDist
      acc.get(author)!.insertions += commit.insertions / totalInsertions
      acc.get(author)!.deletions += commit.deletions / totalDeletions
      acc.get(author)!.locc += (commit.insertions + commit.deletions) / totalLoCC

      return acc
    },
    new Map<
      string,
      {
        author: string
        dist: number
        count: number
        insertions: number
        deletions: number
        locc: number
        compDist: number
      }
    >()
  )

  type AuthorDistribution = typeof authorDistribution extends Map<unknown, infer V> ? V : never

  console.log(
    dsvFormat(",").format(
      Array.from(authorDistribution.values())
        .sort((a, b) => b["compDist"] - a["compDist"])
        .map((entry) =>
          Object.fromEntries(
            Object.entries(entry).map(([k, v]) => [
              k,
              (typeof v === "number" ? v.toString().replace(".", ",") : v).replaceAll(";", "_")
            ])
          )
        ),
      ["author", "count", "dist", "compDist", "locc", "insertions", "deletions"]
    )
  )

  return commits
    .map((d) =>
      Object.values(d)
        .map((x) => (typeof x === "number" ? x.toString().replace(".", ",") : x).replaceAll(";", "_"))
        .join(";")
    )
    .join("\n")

  async function readCommitFileBuffers(commit: string) {
    const fileList = await lstreeCached(path, commit)

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
