import { invariant } from "~/shared/util"
import { AnalysisManager } from "~/server/AnalysisManager"
import type { Route } from "./+types/commits"
import { loadViewSearchParams } from "~/routes/view"
import { parseAsInteger } from "nuqs"
import { createLoader } from "nuqs/server"

const commitsSearchParamsConfig = {
  count: parseAsInteger
}

const loadCommitsSearchParams = createLoader(commitsSearchParamsConfig)

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { path, branch } = loadViewSearchParams(request)
  const { count } = loadCommitsSearchParams(request)

  invariant(branch, "branch is required")
  invariant(path, "path is required")
  invariant(count, "count is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch })

  const commitHashes = await instance.db.getCommitHashes(path, count)
  if (commitHashes.length < 1) return []
  const gitLogResult = await instance.gitService.gitLogSpecificCommits(commitHashes)
  const fullCommits = await instance.getFullCommits(gitLogResult)
  const unions = await instance.db.getRawUnions()

  return fullCommits.map((commit) => {
    const alias = unions.find(({ name, email }) => name === commit.author.name && email === commit.author.email)
    if (!alias) return commit
    return {
      ...commit,
      author: {
        name: alias.displayName,
        email: commit.author.email
      }
    }
  })
}
