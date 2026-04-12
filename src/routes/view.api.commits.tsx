import { currentRepositoryContext, loadViewSearchParams } from "~/routes/view"
import { invariant } from "~/shared/util"
import type { Route } from "./+types/view.api.commits"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const { objectPath } = loadViewSearchParams(request)
  invariant(objectPath, "path is required")

  const rawCount = new URL(request.url).searchParams.get("count")
  const parsedCount = rawCount ? Number(rawCount) : Number.NaN
  const count = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.floor(parsedCount) : 10

  const { repositoryPath, branch, instance } = context.get(currentRepositoryContext)

  invariant(instance, `Instance for repo ${repositoryPath} and branch ${branch} not found`)

  return {
    commitsPromise: (async () => {
      const commitHashes = await instance.db.getCommitHashes(objectPath, count)
      if (commitHashes.length < 1) return []
      const gitLogResult = await instance.gitCaller.gitLogSpecificCommits(commitHashes)
      const fullCommits = await instance.getFullCommits(gitLogResult)
      const unions = await instance.db.getRawUnions()
      return fullCommits.map((commit) => {
        const alias = unions.find(
          ({ authorName, authorEmail }) => authorName === commit.author.name && authorEmail === commit.author.email
        )
        if (!alias) return commit
        return {
          ...commit,
          author: {
            name: alias.displayName,
            email: commit.author.email
          }
        }
      })
    })(),
    commitCount: await instance.db.getCommitCountForPath(objectPath)
  }
}
