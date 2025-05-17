import { GitCaller } from "~/analyzer/git-caller.server.js"
import { contribRegex, gitLogRegex } from "~/analyzer/constants.js"
import type { LoaderFunctionArgs } from "react-router"

type CommitContribData = { commithash: string; message: string; "+": number; "-": number; filepath: string }

const ignore = ["package-lock.json", "yarn.lock", "bun.lockb"]

const std_range = 1

function findOutliers(data: number[]): Set<number> {
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length
  const stdDev = Math.sqrt(data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length)

  console.log("mean", mean, "stdDev", stdDev)
  const lowerBound = mean - std_range * stdDev
  const upperBound = mean + std_range * stdDev

  return new Set(data.filter((value) => value < lowerBound || value > upperBound))
}

async function readCommitContributions({
  repo,
  branch,
  path
}: {
  repo: string
  branch: string
  path: string
}): Promise<CommitContribData[]> {
  const contributionRecords = []

  const gitCaller = new GitCaller(repo, branch, path)

  const gitLog = await gitCaller.gitLog(0, 500)
  const results = gitLog.matchAll(gitLogRegex)

  for (const result of results) {
    const contributions = result.groups.contributions.matchAll(contribRegex)

    let insertions = 0
    let deletions = 0

    for (const contribution of contributions) {
      insertions += contribution.groups.insertions === "-" ? 0 : parseInt(contribution.groups.insertions)
      deletions += contribution.groups.deletions === "-" ? 0 : parseInt(contribution.groups.deletions)

      if (contribution.groups.file.includes("=>")) {
        continue
      }

      contributionRecords.push({
        commithash: result.groups!.hash,
        message: result.groups!.message,
        "+": insertions,
        "-": deletions,
        filepath: contribution.groups!.file
      })
    }
  }

  return contributionRecords
}

export async function detectOutliers(commitContributions: CommitContribData[]) {
  const filteredContributions = commitContributions
    // .filter((e) => e.filepath.endsWith(".ts") || e.filepath.endsWith(".tsx"))
    // .filter((e) => ignore.every((i) => !e.filepath.includes(i)))

  const contributionsByCommit = Array.from(
    filteredContributions
      .reduce((acc, d) => {
        if (!acc.has(d.commithash)) {
          acc.set(d.commithash, { ...d, files: [] })
        }
        const prevValue = acc.get(d.commithash)!
        acc.set(d.commithash, {
          ...d,
          "+": prevValue["+"] + d["+"],
          "-": prevValue["-"] + d["-"],
          files: [...prevValue.files, { filepath: d.filepath, "+": d["+"], "-": d["-"] }]
        })
        return acc
      }, new Map<string, CommitContribData & { files: Array<{ filepath: string; "+": number; "-": number }> }>())
      .values()
  )

  console.log(`Found ${contributionsByCommit.length} commits with ${filteredContributions.length} changes`)

  const insertions = contributionsByCommit.map((commit) => commit["+"])
  const deletions = contributionsByCommit.map((commit) => commit["-"])

  const insertionOutliers = findOutliers(insertions)
  const deletionOutliers = findOutliers(deletions)

  const outliers = contributionsByCommit
    .filter((d) => insertionOutliers.has(d["+"]) || deletionOutliers.has(d["-"]))
    .map((d) => {
      const isInsertionOutlier = insertionOutliers.has(d["+"])
      const isDeletionOutlier = deletionOutliers.has(d["-"])
      return {
        ...d,
        note: isInsertionOutlier && isDeletionOutlier ? "both" : isInsertionOutlier ? "insertion" : "deletion"
      }
    })
  const outliersWithCommitMessages = outliers
    .sort((a, b) => b["+"] + b["-"] - a["+"] - a["-"])
    // .sort((a, b) => b.files.length - a.files.length)
    .map((d) => ({
      hash: d.commithash.slice(0, 7),
      message: d.message.slice(0, 50),
      note: d.note,
      link: `https://github.com/git-truck/git-truck/commit/${d.commithash.slice(0, 7)}`,
      "+": d["+"],
      "-": d["-"],
      files: d.files.map((f) => f.filepath.split("/").pop()).join(", ")
    }))

  console.table(outliersWithCommitMessages)
  return {
    count: contributionsByCommit.length,
    outlierCount: outliersWithCommitMessages.length,
    percentage: (outliersWithCommitMessages.length / contributionsByCommit.length) * 100,
    outliers: outliersWithCommitMessages
  }
}
export const loader = async (args: LoaderFunctionArgs) => {
  const requestUrl = new URL(args.request.url)
  const repo = requestUrl.searchParams.get("repo") ?? "git-truck"
  const branch = requestUrl.searchParams.get("branch") ?? "main"
  const path = requestUrl.searchParams.get("path") ?? "C:/Users/jonas/p/git-truck"
  const commitContributions = await readCommitContributions({ repo, branch, path })
  return await detectOutliers(commitContributions)
}
