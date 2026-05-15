import { useQueryState } from "nuqs"
import { useFetcher, href } from "react-router"
import type { loader } from "~/routes/api.commits"
import { viewSerializer } from "~/routes/viewParams"
import { useClickedObject } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/inspection/CommitHistory"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { isBlob, isRepositoryRoot } from "~/shared/util"
import { useSelectedCategories } from "~/state/stores/selection"
import { useOptions } from "~/contexts/OptionsContext"
import { InspectPanel } from "~/components/inspection/InspectPanel"

export function CommitsInspection({ className = "" }: { className?: string }) {
  const clickedObject = useClickedObject()
  const objectPathIsFile = isBlob(clickedObject)
  const objectPathIsRepo = isRepositoryRoot(clickedObject)
  const { load, data, state, reset } = useFetcher<typeof loader>()
  const [branch] = useQueryState("branch")
  const [path] = useQueryState("path")
  const { metricType } = useOptions()
  const selectedCategories = useSelectedCategories()
  const commitShowCount = data?.currentCommitCount ?? COMMIT_STEP
  const clickedObjectPath = clickedObject.path
  const previousPathRef = useRef<string>("")
  const commitShowCountRef = useRef(commitShowCount)

  // Keep ref in sync with current value
  useEffect(() => {
    commitShowCountRef.current = commitShowCount
  }, [commitShowCount])

  // Memoize selected authors to prevent unnecessary re-renders
  const selectedContributors = useMemo(
    () =>
      metricType === "TOP_CONTRIBUTOR" || metricType === "CONTRIBUTORS"
        ? selectedCategories.map((sel) => sel.replace(`${metricType}:`, ""))
        : [],
    [metricType, selectedCategories]
  )

  // Memoize loadCommits to use in callbacks and pagination
  const loadCommits = useCallback(
    ({ objectPath, contributors, count }: { objectPath: string; contributors: string[]; count: number }) => {
      let url = href("/api/commits") + viewSerializer({ objectPath, path, branch }) + `&count=${count}`
      contributors.forEach((contributor) => {
        url += `&contributors=${encodeURIComponent(contributor)}`
      })
      load(url)
    },
    [branch, load, path]
  )

  // Reload commits when clicked object or selected authors change
  useEffect(() => {
    const pathToLoad = clickedObject.path

    if (pathToLoad) {
      // Check if this is a new path (using ref to avoid objectPath dependency)
      const isNewPath = pathToLoad !== previousPathRef.current
      if (isNewPath) {
        previousPathRef.current = pathToLoad
      }

      loadCommits({ objectPath: pathToLoad, contributors: selectedContributors, count: commitShowCountRef.current })
    }
  }, [clickedObject.path, loadCommits, reset, selectedContributors])

  return (
    <CollapsibleHeader
      className={className}
      title={() => (
        <>
          Commits
          <InspectPanel />
        </>
      )}
      contentClassName="flex flex-col gap-2"
      defaultOpen={false}
      onToggle={(open) => {
        if (open) {
          if (!data && state === "idle") {
            loadCommits({ objectPath: clickedObject.path, contributors: selectedContributors, count: commitShowCount })
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
          loadCommits({
            objectPath: clickedObject.path,
            contributors: selectedContributors,
            count: commitShowCount + COMMIT_STEP
          })
        }}
      />
    </CollapsibleHeader>
  )
}
