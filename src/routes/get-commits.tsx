import { catFile, clearCaches, GitCaller, lstreeCached } from "~/analyzer/git-caller.server.js"
import { contribRegex, gitLogRegex, type gitLogRegexGroups } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"
import { compress } from "@mongodb-js/zstd"
import { mapAsync, printProgressBar } from "~/util.js"
import { log } from "~/analyzer/log.server"
import { getArgs } from "~/analyzer/args.server"
import { join } from "node:path"
import { dsvFormat } from "d3"
import { extractFileExtension } from "~/analyzer/file-util.server"
import InstanceManager from "~/analyzer/InstanceManager.server"

const ignoredExtensions = [
  // Lock files
  ".lock",
  ".lockb",

  // Binary
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".db",
  ".pdf",

  ".eot",
  ".otf",
  ".ttf",
  ".woff",

  ".deb",

  // Docs
  "license",

  // Git Truck
  ".piskel",

  // Twooter
  "dependency",
  "flag_tool",

  // Misc
  ".svg",
  ".txt",
  ".template",

  // Git
  ".gitignore",
  ".gitkeep",
  "pre-commit",

  // Misc
  ".tape",
  ".viz",
  ".example",
  ".log",
  ".rst",
  "test",
  ".typed",
  "codeowners",
  "adoc",
  ".textile",
  ".in",

  ".json"
]

const codeExtensions = [
  // System
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cxx",
  ".cc",
  ".cs",
  ".razor",
  ".java",
  ".go",
  ".rs",
  ".swift",
  ".ml",
  ".py",
  ".py3",
  ".rs",
  ".test",
  ".sh",
  ".http",

  ".sql",

  // Web
  ".mjs",
  ".js",
  ".cjs",
  ".mjs",
  ".jsx",
  ".ts",
  ".mts",
  ".tsx",
  ".html",
  ".css",
  ".scss",

  // Docs
  ".md",

  // Config
  ".config",
  ".cfg",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".pre-commit",
  ".truckignore",
  ".prettierrc",
  ".sln",
  ".eslintignore",
  ".csproj",
  "makefile",
  "vagrantfile",
  "dockerfile"
]

const sanitizeAuthor = (author: string) => {
  return author.replaceAll(",", " ")
}

const isIncluded = (ext: string) => codeExtensions.includes(ext) && !ignoredExtensions.some((ig) => ig.endsWith(ext))

const DEFAULT_COMMIT_COUNT = 100

const authorMap = {
  "Thomas Hoffmann Kilbak": "Thomas",
  tjomson: "Thomas",
  joglr: "Jonas",
  nimrossum: "Jonas",
  "Jonas Nim Røssum": "Jonas",
  "Thomas Kilbak": "Thomas",
  "Jonas Røssum": "Jonas",
  "Jonas Glerup Røssum": "Jonas",
  "Kristoffer Højelse": "Kristoffer",
  emiljapelt: "Emil",
  "Mircea Filip Lungu": "Mircea",
  "vhs-action 📼": "Bot",
  "Automated Version Bump": "Bot",
  "[kaky]": "Kyhl",
  hojelse: "Kristoffer",
  "Dawid Wozniak": "Dawid",
} as const
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

  const instance = InstanceManager.getOrCreateInstance(repo, revision, path)

  log.info(`Analyzing ${repo} (${revision}) in ${path} with ${count} commits`)

  const gitCaller = new GitCaller(repo, revision, path)

  const startTime = performance.now()

  const gitLog = await gitCaller.gitLog(0, count)
  log.warn(await gitCaller.gitRemote())

  const results = gitLog.matchAll(gitLogRegex)
  let lastPrintTime = performance.now()

  const baselineBuffer = Buffer.concat(await readCommitFileBuffers(revision))
  const zFinal = (await compress(baselineBuffer)).length

  const commits = (
    await mapAsync(results, async (result, i, results) => {
      lastPrintTime = printProgressBar(results, i, lastPrintTime, startTime)

      // if last commit, ignore
      if (i === results.length - 1) {
        return null
      }

      const commit: gitLogRegexGroups = result.groups as gitLogRegexGroups
      const contributionResults = commit.contributions.matchAll(contribRegex)

      async function compDistComparedToCommit(targetCommit: string) {
        const targetBuffer = Buffer.concat(await readCommitFileBuffers(targetCommit))
        // const baselineBuffer = Buffer.concat(await readCommitFileBuffers(baselineRevision))

        const zCombined = (await compress(Buffer.concat([baselineBuffer, targetBuffer]))).length
        const zTargetCommit = (await compress(targetBuffer)).length

        return {
          dist: baselineBuffer.length - targetBuffer.length,
          // CD(x) = |R_x R_f| - |R_x|, where R_x is the X’ed commit and R_f is the final commit. Now you get a size in bytes, which is a little easier to understand.
          compDist: zCombined - zTargetCommit,
          // NCD(commit) = (ccCombined - Math.min(ccFinal, ccCommit)) / Math.max(ccFinal, ccCommit)
          normCompDist: (zCombined - Math.min(zFinal, zTargetCommit)) / Math.max(zFinal, zTargetCommit)
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

      const [insertions, deletions] = Array.from(contributionResults)
        .map((c) => c.groups!)
        .reduce(
          ([ins, del], { file, insertions, deletions }) =>
            // Ignore renames
            file.includes("=>") || !isIncluded(extractFileExtension(file))
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
        author: sanitizeAuthor(authorMap[commit.author as keyof typeof authorMap] ?? commit.author),
        message: commit.message,
        insertions,
        deletions,
        locc: insertions + deletions,
        dist: fromLatest.dist,
        distDelta: fromLatestPrev.dist - fromLatest.dist,
        compDist: fromLatest.compDist,
        compDistDelta: fromLatestPrev.compDist - fromLatest.compDist,
        normCompDist: fromLatest.normCompDist,
        normCompDistDelta: fromLatestPrev.normCompDist - fromLatest.normCompDist,
        size: baselineBuffer.length
      }
    })
  ).filter(Boolean)

  const totals = Array.from(commits.values()).reduce(
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

  for (let [k, v] of Object.entries(totals)) {
    if (v === 0) {
      throw new Error(`${k} is zero. This is likely due to the repository being empty or not having any commits.`)
    }
    if (isNaN(v)) {
      throw new Error(`${k} is NaN. This is likely due to the repository being empty or not having any commits.`)
    }
  }

  const { totalDist, totalCompDist, totalLoCC, totalInsertions, totalDeletions, totalCommitCount } = totals

  const timeSeries = []

  const authorDistribution: Map<
    string,
    {
      dist: number
      count: number
      insertions: number
      deletions: number
      locc: number
      compDistDelta: number
    }
  > = commits.reduce(
    (acc, commit) => {
      const author = sanitizeAuthor(authorMap[commit.author as keyof typeof authorMap] ?? commit.author)

      if (!acc.has(author)) {
        acc.set(author, { author, dist: 0, count: 0, insertions: 0, deletions: 0, locc: 0, compDistDelta: 0 })
      }

      acc.get(author)!.count += 1 / totalCommitCount
      acc.get(author)!.dist += commit.distDelta / totalDist
      acc.get(author)!.compDistDelta += commit.compDistDelta / totalCompDist
      acc.get(author)!.insertions += commit.insertions / totalInsertions
      acc.get(author)!.deletions += commit.deletions / totalDeletions
      acc.get(author)!.locc += (commit.insertions + commit.deletions) / totalLoCC

      timeSeries.push({
        date: commit.date
      })

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
        compDistDelta: number
      }
    >()
  )

  // Author distribution
  return dsvFormat(",").format(
    Array.from(authorDistribution.values())
      .sort((a, b) => b["compDistDelta"] - a["compDistDelta"])
      .map((entry) =>
        Object.fromEntries(
          Object.entries(entry).map(([k, v]) => [
            k,
            (typeof v === "number" ? v.toString().replace(".", ",") : v).replaceAll(";", "_")
          ])
        )
      ),
    ["author", "compDistDelta", "locc",]
  )

  // For benchmarking, disable caching
  // clearCaches()

  // Commits
  return dsvFormat(",").format(
    commits
      // .sort((a, b) => b["compDist"] - a["compDist"])
      .map((entry) =>
        Object.fromEntries(
          Object.entries(entry).map(([k, v]) => [
            k,
            (typeof v === "number" ? v.toString().replace(".", ",") : v).replaceAll(";", "_")
          ])
        )
      ),
    ["hash", "date", "author", "message", "locc", "insertions", "deletions", "dist", "distDelta", "compDist", "compDistDelta", "normCompDist", "normCompDistDelta", "size"]
  )

  async function readCommitFileBuffers(commit: string) {
    const fileList = await lstreeCached(path, commit)

    const inherentExtensions = fileList.files.map((f) => extractFileExtension(f.fileName))

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
            // .filter(([ext, count]) => {
            //   const extensionFrequency = count / fileList.files.length
            //   return extensionFrequency > 0.01
            // })
            // Warn if a prevalent is found that is not specified as a code extension or ignore extension
            .map((entry) => {
              if (!codeExtensions.includes(entry[0]) && !ignoredExtensions.some((ig) => entry[0].endsWith(ig))) {
                // log.warn(
                //   `Extension ${entry[0]} is present in commit ${commit.slice(0, 7)}, but is neither ignore or marked as a code extension. Do you want to exclude it?`
                // )
              }
              return entry
            })
            // Only include extensions that are in the codeExtensions list
            .filter(([ext]) => isIncluded(ext))
            .map(([ext]) => ext)

    const filteredFiles = fileList.files.filter(
      (file) =>
        // Include files that are in the codeExtensions list
        extensionsToUse.some((ext) => file.fileName.endsWith(ext)) &&
        // Exclude files that are in the ignore list
        !ignoredExtensions.some((i) => file.fileName.endsWith(i))
    )

    const fileBuffers = (await mapAsync(filteredFiles, (f) => catFile(path, f.hash))) as Buffer[]

    return fileBuffers
  }
}
