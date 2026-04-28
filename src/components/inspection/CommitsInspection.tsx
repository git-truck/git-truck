import { useQueryState } from "nuqs"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/api.commits"
import { viewSerializer } from "~/routes/view"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory, CommitHistoryLabel } from "~/components/inspection/CommitHistory"
import { useCallback, useEffect } from "react"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"

export function CommitsInspection() {
  const clickedObject = useClickedObject()
  const { load, data, state, reset } = useFetcher<typeof loader>()
  const [branch] = useQueryState("branch")
  const [path] = useQueryState("path")
  const commitShowCount = data?.currentCommitCount ?? COMMIT_STEP
  const objectPath = data?.objectPath ?? ""

  const loadCommits = useCallback(
    (objectPath: string, count: number) =>
      load(href("/api/commits") + viewSerializer({ objectPath, path, branch }) + `&count=${count}`),
    [branch, load, path]
  )

  useEffect(() => {
    if (objectPath && objectPath !== clickedObject?.path) {
      reset()
      loadCommits(clickedObject.path, commitShowCount)
    }
  }, [clickedObject.path, commitShowCount, loadCommits, objectPath, reset])

  return (
    <CollapsibleHeader
      title="Commits"
      className="card"
      contentClassName="pb-6 flex flex-col gap-2"
      defaultOpen={false}
      onToggle={(open) => {
        if (open) {
          if (!data && state === "idle") {
            loadCommits(clickedObject.path, commitShowCount)
          }
        } else {
          reset()
        }
      }}
    >
      {!data ? (
        <div className="flex flex-col gap-2">
          <CommitHistoryLabel />
          <h3>Loading...</h3>
        </div>
      ) : (
        <Await resolve={data.commitsPromise}>
          {(commits) => (
            <CommitHistory
              commits={commits}
              loadedCommitCount={commitShowCount}
              totalCommitCount={data?.totalCommitCount ?? 0}
              isLoading={state !== "idle"}
              onShowMoreCommits={() => {
                if (!clickedObject) return
                loadCommits(clickedObject.path, commitShowCount + COMMIT_STEP)
              }}
            />
          )}
        </Await>
      )}
    </CollapsibleHeader>
  )
}
