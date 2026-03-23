import { useQueryState } from "nuqs"
import { useCallback, useEffect, useRef, useState } from "react"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/view.api.commits"
import { viewSerializer } from "~/routes/view"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory, CommitHistoryLabel } from "~/components/inspection/CommitHistory"

export function CommitsInspection() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const [commitShowCount, setCommitShowCount] = useState(COMMIT_STEP)
  const previousData = useRef<ReturnType<typeof useFetcher<typeof loader>>["data"]>(undefined)

  useEffect(() => {
    if (fetcher.data) {
      previousData.current = fetcher.data
    }
  }, [fetcher.data])

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

  const data = fetcher.data ?? previousData.current

  if (!data) {
    return (
      <div className="flex flex-col gap-2">
        <CommitHistoryLabel />
        <h3>Loading...</h3>
      </div>
    )
  }

  return (
    <Await resolve={data.commitsPromise}>
      {(commits) => (
        <CommitHistory
          commits={commits}
          loadedCommitCount={commitShowCount}
          totalCommitCount={data.commitCount ?? 0}
          isLoading={fetcher.state !== "idle"}
          onCountChange={() => {
            setCommitShowCount((prev) => prev + COMMIT_STEP)
          }}
        />
      )}
    </Await>
  )
}
