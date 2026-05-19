import { loadViewSearchParams, viewSearchParamsConfig } from "~/shared/viewParams"
import { invariant } from "~/shared/util"
import type { Route } from "./+types/api.commits"
import { AnalysisManager } from "~/server/AnalysisManager"
import { createLoader, parseAsArrayOf, parseAsInteger, parseAsString } from "nuqs/server"
import { createSerializer } from "nuqs"

const commitsSearchParamsConfig = {
  ...viewSearchParamsConfig,
  count: parseAsInteger,
  contributors: parseAsArrayOf(parseAsString).withDefault([])
}

const loadCommitsSearchParams = createLoader(commitsSearchParamsConfig)
export const commitsSerializer = createSerializer(commitsSearchParamsConfig)

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { objectPath, path: repositoryPath, branch, start, end } = loadViewSearchParams(request, { strict: true })
  const { count, contributors } = loadCommitsSearchParams(request, {
    strict: true
  })

  invariant(count !== null, "count is required")
  invariant(repositoryPath, "path is required")
  invariant(branch, "branch is required")
  invariant(objectPath, "objectPath is required")
  invariant(start !== null, "start is required")
  invariant(end !== null, "end is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath, branch: branch })

  using _timeInterval = await instance.withTimeInterval(start, end)

  const getCommits = async () => {
    const commitHashes = await instance.db.getCommitHashes(objectPath, count, contributors)
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
  }

  return {
    objectPath: objectPath,
    currentCommitCount: count,
    totalCommitCount: await instance.db.getCommitCountForPath({
      objectPath,
      startSecs: start,
      endSecs: end,
      contributors
    }),
    commits: await getCommits()
  }
}
