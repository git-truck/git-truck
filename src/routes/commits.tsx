import { invariant } from "~/shared/util"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/commits"
import { currentRepositoryContext } from "~/routes/view"
import { getRepoNameFromPath } from "~/shared/util.server"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const { repositoryPath: path, branch } = context.get(currentRepositoryContext)
  const repo = getRepoNameFromPath(path)
  const url = new URL(request.url)
  const count = url.searchParams.get("count")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")
  invariant(count, "count is required")

  const instance = InstanceManager.getInstance(path, branch)
  if (!instance) return []

  const commitHashes = await instance.db.getCommitHashes(path, Number(count))
  if (commitHashes.length < 1) return []
  const gitLogResult = await instance.gitCaller.gitLogSpecificCommits(commitHashes)
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
