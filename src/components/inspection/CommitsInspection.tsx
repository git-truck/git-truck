import { useQueryState } from "nuqs"
import { useCallback, useEffect, useState } from "react"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/view.api.commits"
import { viewSerializer } from "~/routes/view"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/inspection/CommitHistory"

export function CommitsInspection() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const [commitShowCount, setCommitShowCount] = useState(COMMIT_STEP)

  const loadCommits = useCallback(
    (count: number) => {
      if (!clickedObject) return

      fetcher.load(
        href("/view/api/commits") + viewSerializer({ objectPath: clickedObject.path, path }) + `&count=${count}`
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clickedObject?.path, path]
  )

  useEffect(() => {
    loadCommits(commitShowCount)
    return () => {
      fetcher.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitShowCount])

  if (!fetcher.data) {
    return "Loading..."
  }

  return (
    <Await resolve={fetcher.data.commitsPromise}>
      {(commits) => (
        <CommitHistory
          commits={commits}
          loadedCommitCount={commitShowCount}
          totalCommitCount={fetcher.data?.commitCount ?? 0}
          onCountChange={() => {
            setCommitShowCount((prev) => prev + COMMIT_STEP)
          }}
        />
      )}
    </Await>
  )
}
