import { useQueryState } from "nuqs"
import { useFetcher, href, Await } from "react-router"
import type { loader } from "~/routes/api.commits"
import { viewSerializer } from "~/routes/viewParams"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/inspection/CommitHistory"
import { useCallback, useEffect, useMemo, useRef } from "react"
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
  const clickedHash = clickedObject.hash
  const previousPathRef = useRef<string>("")
  const commitShowCountRef = useRef(commitShowCount)

  // Keep ref in sync with current value
  useEffect(() => {
    commitShowCountRef.current = commitShowCount
  }, [commitShowCount])

  // Memoize selected authors to prevent unnecessary re-renders
  const selectedAuthors = useMemo(
    () =>
      metricType === "TOP_CONTRIBUTOR" || metricType === "CONTRIBUTORS"
        ? selectedCategories.map((sel) => sel.replace(`${metricType}:`, ""))
        : [],
    [metricType, selectedCategories]
  )

  // Memoize loadCommits to use in callbacks and pagination
  const loadCommits = useCallback(
    ({ objectHash, count }: { objectHash: string; count: number }) =>
      load(href("/api/commits") + viewSerializer({ objectHash: objectHash, path, branch }) + `&count=${count}`),
    [branch, load, path]
  )

  // Reload commits when clicked object or selected authors change
  useEffect(() => {
    if (clickedHash && clickedHash !== clickedObject?.hash) {
      reset()
      loadCommits({ objectHash: clickedObject.hash, count: commitShowCount })
    }
  }, [clickedObject.path, commitShowCount, loadCommits, clickedHash, reset])

  return (
    <CollapsibleHeader
      title={
        <>
          {clickedHash ? (
            <>
              <span className="truncate" title={clickedObject.path}>
                {"Commits: "}
                <span className="text-primary-text dark:text-primary-text-dark ml-1 font-bold normal-case">
                  {objectPathIsRepo ? (
                    <>
                      {clickedObject.path}{" "}
                      <span className="text-tertiary-text dark:text-tertiary-text-dark">(repo)</span>
                    </>
                  ) : objectPathIsFile ? (
                    clickedObject.path.split("/").pop()
                  ) : (
                    clickedObject.path.split("/").pop() + "/"
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
      contentClassName="flex flex-col gap-2"
      defaultOpen={false}
      onToggle={(open) => {
        if (open) {
          if (!data && state === "idle") {
            loadCommits({ objectHash: clickedObject.hash, count: commitShowCount })
          }
        } else {
          reset()
        }
      }}
    >
      <CommitHistory
        commits={data?.commits ?? []}
        loadedCommitCount={commitShowCount}
        totalCommitCount={data?.totalCommitCount ?? 0}
        isLoading={state !== "idle"}
        onShowMoreCommits={() => {
          if (!clickedObject) return
          loadCommits({ objectHash: clickedObject.hash, count: commitShowCount + COMMIT_STEP })
        }}
      />
    </CollapsibleHeader>
  )
}
