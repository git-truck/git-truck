import { useQueryState } from "nuqs"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/api.commits"
import { viewSerializer } from "~/routes/view"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/inspection/CommitHistory"
import { useCallback, useEffect, useMemo } from "react"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { isBlob, isRepositoryRoot } from "~/shared/util"
import { useSelectedCategories } from "~/state/stores/selection"
import { useOptions } from "~/contexts/OptionsContext"

export function CommitsInspection() {
  const clickedObject = useClickedObject()
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)
  const { load, data, state, reset } = useFetcher<typeof loader>()
  const [branch] = useQueryState("branch")
  const [path] = useQueryState("path")
  const { metricType } = useOptions()
  const selectedCategories = useSelectedCategories()
  const commitShowCount = data?.currentCommitCount ?? COMMIT_STEP
  const objectPath = data?.objectPath ?? ""
  const clickedObjectPath = clickedObject.path

  // Memoize selected authors to prevent unnecessary re-renders
  const selectedAuthors = useMemo(
    () =>
      metricType === "TOP_CONTRIBUTOR" || metricType === "CONTRIBUTORS"
        ? selectedCategories.map((selection) => selection.replace(`${metricType}:`, ""))
        : [],
    [metricType, selectedCategories]
  )

  //Reload commits when selected authors change
  const loadCommits = useCallback(
    (objectPath: string, count: number) => {
      let url = href("/api/commits") + viewSerializer({ objectPath, path, branch }) + `&count=${count}`
      selectedAuthors.forEach((author) => {
        url += `&authors=${encodeURIComponent(author)}`
      })
      load(url)
    },
    [branch, load, path, selectedAuthors]
  )

  // Reload commits when the clicked object changes
  useEffect(() => {
    if (objectPath && objectPath !== clickedObject?.path) {
      reset()
      loadCommits(clickedObject.path, commitShowCount)
    }
  }, [clickedObject.path, commitShowCount, loadCommits, objectPath, reset])

  // Reload commits when selected authors change
  useEffect(() => {
    if (objectPath) {
      let url = href("/api/commits") + viewSerializer({ objectPath, path, branch }) + `&count=${commitShowCount}`
      selectedAuthors.forEach((author) => {
        url += `&authors=${encodeURIComponent(author)}`
      })
      load(url)
    }
  }, [objectPath, path, branch, commitShowCount, selectedAuthors, load])

  return (
    <CollapsibleHeader
      title={
        <>
          {clickedObjectPath ? (
            <>
              <span className="truncate" title={clickedObjectPath}>
                {"Commits: "}
                <span className="text-primary-text dark:text-primary-text-dark ml-1 font-bold normal-case">
                  {objectPathIsRepo ? (
                    <>
                      {clickedObjectPath}{" "}
                      <span className="text-tertiary-text dark:text-tertiary-text-dark">(repo)</span>
                    </>
                  ) : objectPathIsFile ? (
                    clickedObjectPath.split("/").pop()
                  ) : (
                    clickedObjectPath.split("/").pop() + "/"
                  )}
                </span>
              </span>
            </>
          ) : (
            "Commits"
          )}
        </>
      }
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
      <Await resolve={data?.commitsPromise}>
        {(commits) => (
          <CommitHistory
            commits={commits ?? []}
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
    </CollapsibleHeader>
  )
}
