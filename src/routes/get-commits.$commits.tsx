import { catFile, GitCaller, lstree } from "~/analyzer/git-caller.server.js"
import { contribRegex, gitLogRegex } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"
import { compress } from "@mongodb-js/zstd"
import { amap } from "~/util.js"

const ignore = ["package-lock.json", "yarn.lock", "bun.lockb"]
const include = ["js", "jsx", "ts", "tsx", "json", "yml"]
const include_broad = ["ts", "tsx", "json", "yml", "md", "css", "gitignore", "cjs", "mjs", "sh", "js"]

const std_range = 1

/**
 * Reads all files existing in a commit into a single buffer
 */
async function readCommitFileBuffers({ repoPath, commit }: { repoPath: string; commit: string }) {
  const fileList = await lstree(repoPath, commit)

  const fileBuffers = (
    await Promise.all(
      fileList.files
        .filter((file) => !ignore.some((i) => file.fileName.includes(i)))
        .filter((file) => include.some((ext) => file.fileName.endsWith(ext)))
        .map((file) => catFile(repoPath, file.hash))
    )
  ).filter(Boolean) as Buffer[]
  return fileBuffers
}

/**
 * Looks up a list of commit hashes and returns the commit details
 */
async function readCommits({
  repo,
  branch,
  commits: commitHashes,
  path
}: {
  repo: string
  branch: string
  commits: string[]
  path: string
}) {
  const gitCaller = new GitCaller(repo, branch, path)

  const gitLog = await gitCaller.gitLogSpecificCommits(commitHashes)
  const results = gitLog.matchAll(gitLogRegex)

  const commits = await amap(results, async (result) => {
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

    const commitBuffer = Buffer.concat(await readCommitFileBuffers({ repoPath: path, commit: commitHash }))
    const zCommit = (await compress(commitBuffer)).length

    async function ncdComparedToRevision(baselineCommitOrBranch: string) {
      const baselineBuffer = Buffer.concat(
        await readCommitFileBuffers({ repoPath: path, commit: baselineCommitOrBranch })
      )

      const zCombined = (await compress(Buffer.concat([baselineBuffer, commitBuffer]))).length
      const zBaseline = (await compress(baselineBuffer)).length

      // https://en.wikipedia.org/wiki/Normalized_compression_distance
      return (zCombined - Math.min(zBaseline, zCommit)) / Math.max(zBaseline, zCommit)
    }

    async function cdComparedToRevision(target: string, baseline: string) {
      const targetBuffer = Buffer.concat(await readCommitFileBuffers({ repoPath: path, commit: target }))
      const baselineBuffer = Buffer.concat(await readCommitFileBuffers({ repoPath: path, commit: baseline }))

      const zCombined = (await compress(Buffer.concat([baselineBuffer, targetBuffer]))).length
      const zTarget = (await compress(targetBuffer)).length

      // CD(x) = |R_x R_f| - |R_x|, where R_x is the X’ed commit and R_f is the final commit. Now you get a size in bytes, which is a little easier to understand.
      return zCombined - zTarget
    }

    const ncdFromPrev = await ncdComparedToRevision(`${commitHash}~1`)
    const ncdFromLatest = await ncdComparedToRevision(branch)

    const cdFromLatest = await cdComparedToRevision(commitHash, branch)
    const cdFromLatestPrev = await cdComparedToRevision(`${commitHash}~1`, branch)
    const cdDelta = cdFromLatestPrev - cdFromLatest

    const cdFromPrev = await cdComparedToRevision(commitHash, `${commitHash}~1`)

    const [insertions, deletions] = Array.from(contributionResults)
      .map((c) => c.groups!)
      .reduce(
        ([ins, del], { file, insertions, deletions }) =>
          file.includes("=>")
            ? [ins, del]
            : [ins + insertions === "-" ? 0 : parseInt(insertions), del + deletions === "-" ? 0 : parseInt(deletions)],
        [0, 0]
      )

    return {
      commitHash,
      date,
      message,
      size: commitBuffer.length,
      insertions,
      deletions,
      cdFromPrev,
      cdFromLatest,
      cdDelta,
      ncdFromPrev,
      ncdFromLatest
    }
  })

  return commits
}

export const loader = async (args: LoaderFunctionArgs) => {
  // concatenated string of commit hashes
  const commitHashesConcatenated = args.params.commits
  // commit is a 40 character hash, so split them every 40 characters
  const commitHashes = commitHashesConcatenated!.match(/.{1,40}/g)?.map((d) => d.trim()) ?? []

  // get commit details for commits

  const requestUrl = new URL(args.request.url)
  const repo = requestUrl.searchParams.get("repo") ?? "git-truck"
  const branch = requestUrl.searchParams.get("branch") ?? "HEAD"
  const path = requestUrl.searchParams.get("path") ?? `C:/Users/jonas/p/${repo}`

  const commits = await readCommits({ repo, branch, commits: commitHashes, path })

  const averageCDDelta = commits.reduce((acc, commit) => acc + commit.cdDelta, 0) / commits.length

  console.log(`Average CD Delta: ${averageCDDelta}`)

  return commits
    .map((d) =>
      Object.values(d)
        .map((x) => (typeof x === "number" ? x.toString().replace(".", ",") : x))
        .join(";")
    )
    .join("\n")
}
