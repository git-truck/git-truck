import InstanceManager from "../analyzer/InstanceManager.server.js"
import { log } from "~/analyzer/log.server.js"
import { catFile, GitCaller, lstree } from "~/analyzer/git-caller.server.js"
import { gitLogRegex } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"
import { promiseHelper, time } from "~/analyzer/util.server.js"
import { compress } from "@mongodb-js/zstd"
import { resolve } from "node:path"
import { writeFileSync } from "node:fs"
import { printProgressBar } from "~/util.js"

type CommitData = { hash: string; message: string }

const ignore = ["package-lock.json", "yarn.lock", "bun.lockb"]

const std_range = 1

function findOutliers(data: number[]): { mean: number; stdDev: number; outliers: Set<number> } {
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length
  const stdDev = Math.sqrt(data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length)

  console.log("mean", mean, "stdDev", stdDev)
  const lowerBound = mean - std_range * stdDev
  const upperBound = mean + std_range * stdDev

  return { mean, stdDev, outliers: new Set(data.filter((value) => value < lowerBound || value > upperBound)) }
}

async function readCommits({
  repo,
  branch,
  path
}: {
  repo: string
  branch: string
  path: string
}): Promise<CommitData[]> {
  const commits = []

  const gitCaller = new GitCaller(repo, branch, path)

  const gitLog = await gitCaller.gitLog(0, 2000)

  const results = gitLog.matchAll(gitLogRegex)

  for (const result of results) {
    commits.push({
      hash: result.groups!.hash,
      message: result.groups!.message,
      date: result.groups!.dateauthor,
      date2: result.groups!.datecommitter
    })
  }

  return commits
}

const largeFileThreshold = 100_000
const EMPTY_COMMIT = "0000000000000000000000000000000000000000"

export const loader = async (args: LoaderFunctionArgs) => {
  const requestUrl = new URL(args.request.url)
  const repo = requestUrl.searchParams.get("repo") ?? "git-truck"
  const branch = requestUrl.searchParams.get("branch") ?? "main"
  const path = requestUrl.searchParams.get("path") ?? "C:/Users/jonas/p/git-truck"
  const rawData: CommitData[] = await readCommits({ repo, branch, path })
  const commits = rawData

  const ins = InstanceManager.getOrCreateInstance(repo, branch, resolve(path, ".."))

  let fileTree = await ins.analyzeTreeFlat()

  const removedFiles = fileTree.filter((x) => x.size! >= largeFileThreshold)
  fileTree = fileTree
    .filter((x) => x.size! < largeFileThreshold)
    .filter((e) => ignore.every((i) => !e.path.includes(i)))
    .filter((e) => e.path.endsWith(".ts") || e.path.endsWith(".tsx"))

  log.info(
    `Removed files: ${removedFiles
      .sort((a, b) => (a.size ?? 0) - (b.size ?? 0))
      .map((x) => `${x.path} (size: ${x.size?.toLocaleString()} bytes)`)
      .join(", ")}`
  )
  log.info(`Largest file : ${Math.max(...fileTree.map((x) => x.size ?? 0).filter(Boolean)).toLocaleString()} bytes`)
  log.info(`Smallest file: ${Math.min(...fileTree.map((x) => x.size ?? 0).filter(Boolean)).toLocaleString()} bytes`)

  const frbStartTime = performance.now()
  let lastPrintTime = performance.now()

  const finalRevisionBuffers = await time(
    () =>
      Promise.all(
        fileTree.map(async (f, i, all) => {
          lastPrintTime = printProgressBar(all, i, lastPrintTime, frbStartTime)
          const [result, err] = await promiseHelper(catFile(path, f.hash))
          if (err) {
            log.error(`Error reading file ${f.hash}: ${err}`)
            return null
          }
          return result
        })
      ),
    "Read initial revision"
  )()

  const count = finalRevisionBuffers.length
  const filteredRevisionBuffers = finalRevisionBuffers.filter(Boolean) as Array<Buffer>
  const countFiltered = filteredRevisionBuffers.length
  const skippedFileCount = count - countFiltered
  if (skippedFileCount) {
    log.info(`Skipped ${skippedFileCount} of ${count} files`)
  }

  log.info(
    `Compressing final revision (${filteredRevisionBuffers.reduce((acc, b) => acc + b.length, 0).toLocaleString()} bytes)`
  )
  const bufferFinal = Buffer.concat(filteredRevisionBuffers.map((b) => Buffer.from(b)))
  const ccFinal = (await time(compress, "Compress final revision")(bufferFinal)).length

  async function ncd(fileBuffer: Buffer): Promise<number> {
    const ccCommit = (await compress(fileBuffer)).length
    const combined = Buffer.concat([...filteredRevisionBuffers, fileBuffer])
    const ccCombined = (await compress(combined)).length
    const ncdValue = (ccCombined - Math.min(ccFinal, ccCommit)) / Math.max(ccFinal, ccCommit)
    return ncdValue
  }

  const ncdStartTime = performance.now()
  console.log()

  const commitNcdResults = await time(async () => {
    const results = []
    let i = 0
    for (const commit of commits) {
      const commitFiles = (await lstree(path, commit.hash)).files.filter((f) => f.hash !== EMPTY_COMMIT)
      // const commitFiles = (await difftree(path, commit.hash)).files.filter((f) => f.hash !== EMPTY_COMMIT)

      const committedFileData = []

      for (const f of commitFiles) {
        const result = await catFile(path, f.hash)
        committedFileData.push(result)
      }

      const filteredCommittedFiles = committedFileData.filter(Boolean) as Array<Buffer>

      const files = committedFileData.length
      const filesFiltered = filteredCommittedFiles.length
      const concatenatedFileBuffer = Buffer.concat(filteredCommittedFiles)

      const commitNCD = await ncd(concatenatedFileBuffer)

      // Progress bar
      lastPrintTime = printProgressBar(commits, i, lastPrintTime, ncdStartTime)

      results.push({ ...commit, commitNCD, files, filesFiltered })
      i++
    }
    return results
  }, "Calculate NCD")()

  console.log(`Found ${commitNcdResults.length} commits`)

  const ncds = commitNcdResults.map((commit) => commit.commitNCD)

  const { mean, stdDev, outliers: ncdOutliers } = findOutliers(ncds)

  const outliers = commitNcdResults
  // .filter((d) => ncdOutliers.has(d.commitNCD))

  console.log(`Found ${outliers.length} outliers of ${commitNcdResults.length} commits`)

  const outliersForOutput = outliers
    .sort((a, b) => b["commitNCD"] - a["commitNCD"])
    // .sort((a, b) => b.files.length - a.files.length)
    .map((d) => ({
      link: `https://github.com/git-truck/git-truck/commit/${d.hash.slice(0, 7)}`,
      hash: d.hash,
      message: d.message,
      note: d.commitNCD > mean ? "above" : "below",
      commitNCD: d.commitNCD,
      files: d.files
    }))
  // .filter(d => d.note === "below")

  const csv = outliersForOutput.map((d) => `${d.hash},${d.message},${d.commitNCD},${d.files}`).join("\n")
  writeFileSync("outliers.csv", csv)

  console.table(outliersForOutput)
  return {
    count: commitNcdResults.length,
    mean,
    stdDev,
    outlierCount: outliersForOutput.length,
    percentage: (outliersForOutput.length / commitNcdResults.length) * 100,
    outliers: outliersForOutput
  }
}
