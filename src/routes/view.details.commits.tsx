import { CommitHistory } from "~/components/CommitHistory"
import { invariant } from "~/shared/util"
import type { Route } from "./+types/view.details.commits"
import { Suspense } from "react"
import { Await, useLoaderData } from "react-router"
import { currentRepositoryContext } from "./view"

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const objectPath = url.searchParams.get("path")
  invariant(objectPath, "path is required")

  const { repositoryPath, branch, instance } = context.get(currentRepositoryContext)

  const count = url.searchParams.get("count") ?? "10"

  invariant(instance, `Instance for repo ${repositoryPath} and branch ${branch} not found`)

  return {
    commitsPromise: (async () => {
      const commitHashes = await instance.db.getCommitHashes(objectPath, Number(count))
      if (commitHashes.length < 1) return []
      const gitLogResult = await instance.gitCaller.gitLogSpecificCommits(commitHashes)
      const fullCommits = await instance.getFullCommits(gitLogResult)
      const unions = await instance.db.getRawUnions()
      return fullCommits.map((commit) => {
        const alias = unions.find(({ alias }) => alias === commit.author)
        if (!alias) return commit
        return {
          ...commit,
          author: alias.actualname
        }
      })
    })(),
    commitCount: await instance.db.getCommitCountForPath(objectPath)
  }
}

// function fetchCommitCount() {
//     const searchParams = new URLSearchParams()
//     searchParams.set("branch", databaseInfo.branch)
//     searchParams.set("repo", databaseInfo.repo)
//     if (!clickedObject?.path) return
//     searchParams.set("path", clickedObject.path)
//     commitFetcher.load(`/commitcount?${searchParams.toString()}`)
//   }

// useEffect(() => {
//   if (clickedObject?.type === "blob" && existingCommitCount) {
//     setCommitCount(existingCommitCount)
//     setSearch
//   } else {
//     fetchCommitCount()
//   }
// }, [databaseInfo, clickedObject])

export default function Commits() {
  const { commitCount, commitsPromise } = useLoaderData<typeof loader>()

  return (
    <div className="">
      <Suspense fallback={<p>Loading commits...</p>}>
        <Await resolve={commitsPromise}>
          {(commits) => <CommitHistory commits={commits} commitCount={commitCount ?? 0} />}
        </Await>
      </Suspense>
    </div>
  )
}
