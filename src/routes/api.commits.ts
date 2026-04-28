import { loadViewSearchParams } from "~/routes/view"
import { invariant } from "~/shared/util"
import type { Route } from "./+types/api.commits"
import { AnalysisManager } from "~/server/AnalysisManager"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { objectPath, path: repositoryPath, branch } = loadViewSearchParams(request)
  invariant(repositoryPath, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")

  const rawCount = new URL(request.url).searchParams.get("count")
  const parsedCount = rawCount ? Number(rawCount) : Number.NaN
  const count = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.floor(parsedCount) : 10

  const instance = await AnalysisManager.getInstance({ repositoryPath, branch: branch })

  return {
    objectPath,
    currentCommitCount: count,
    totalCommitCount: await instance.db.getCommitCountForPath(objectPath),
    commitsPromise: (async () => {
      const commitHashes = await instance.db.getCommitHashes(objectPath, count)
      if (commitHashes.length < 1) return []
      const gitLogResult = await instance.gitService.gitLogSpecificCommits(commitHashes)
      const fullCommits = await instance.getFullCommits(gitLogResult)
      const unions = await instance.db.getRawUnions()

      const aliasByIdentity = new Map<string, { displayName: string; email: string }>()
      unions.forEach((union) => {
        aliasByIdentity.set(`${union.name}\u0000${union.email}`, {
          displayName: union.displayName,
          email: union.email
        })
      })

      const applyUnionAlias = (person: { name: string; email: string }) => {
        const alias = aliasByIdentity.get(`${person.name}\u0000${person.email}`)
        if (!alias) return person
        return {
          name: alias.displayName,
          email: alias.email
        }
      }

      return fullCommits.map((commit) => {
        return {
          ...commit,
          author: applyUnionAlias(commit.author),
          coauthors: commit.coauthors.map((coauthor) => applyUnionAlias(coauthor))
        }
      })
    })()
  }
}
