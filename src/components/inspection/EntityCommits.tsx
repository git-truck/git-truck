import { useQueryState } from "nuqs"
import { useCallback, useEffect, useRef } from "react"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/view.api.commits"
import { viewSerializer } from "~/routes/view"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/CommitHistory"

export function EntityCommits() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const countRef = useRef(COMMIT_STEP)

  const loadCommits = useCallback(
    (count: number) => {
      if (!clickedObject) return
      countRef.current = count
      fetcher.load(
        href("/view/api/commits") + viewSerializer({ objectPath: clickedObject.path, path }) + `&count=${count}`
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clickedObject?.path, path]
  )

  useEffect(() => {
    if (!clickedObject) return
    countRef.current = COMMIT_STEP
    loadCommits(COMMIT_STEP)
    return () => {
      fetcher.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path, path])

  if (!fetcher.data) {
    return "Loading..."
  }

  return (
    <Await resolve={fetcher.data.commitsPromise}>
      {(commits) => (
        <CommitHistory commits={commits} commitCount={fetcher.data?.commitCount ?? 0} onCountChange={loadCommits} />
      )}
    </Await>
  )
}
