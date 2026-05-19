import { useQueryStates } from "nuqs"
import { useFetcher, href } from "react-router"
import { commitsSerializer, type loader } from "~/routes/api.commits"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { useClickedObjectPath } from "~/state/stores/clicked-object"
import { COMMIT_STEP, CommitHistory } from "~/components/inspection/CommitHistory"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useSelectedCategories } from "~/state/stores/selection"
import { useOptions } from "~/contexts/OptionsContext"
import { InspectPanel } from "~/components/inspection/InspectPanel"

export function CommitsInspection({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const clickedObjectPath = useClickedObjectPath()
  const { load, data, state, reset } = useFetcher<typeof loader>()
  const [{ path, branch, start, end }] = useQueryStates(viewSearchParamsConfig)

  const { metricType } = useOptions()
  const selectedCategories = useSelectedCategories()

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
    ({
      objectPath,
      contributors,
      count,
      start = null,
      end = null
    }: {
      objectPath: string
      contributors: string[]
      count: number
      start?: number | null
      end?: number | null
    }) => {
      const url =
        href("/api/commits") + commitsSerializer({ objectPath, path, branch, count, contributors, start, end })

      if (open) {
        load(url)
      }
    },
    [branch, load, open, path]
  )

  // Reload commits when clicked object or selected authors change
  useEffect(() => {
    const pathToLoad = clickedObjectPath

    loadCommits({ objectPath: pathToLoad, contributors: selectedContributors, count: COMMIT_STEP, start, end })
    return () => reset()
  }, [clickedObjectPath, end, loadCommits, reset, selectedContributors, start])

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
      open={open}
      onToggle={(open) => {
        setOpen(open)
        if (open) {
          if (state === "idle") {
            loadCommits({ objectPath: clickedObjectPath, contributors: selectedContributors, count: COMMIT_STEP })
          }
        } else {
          reset()
        }
      }}
    >
      <CommitHistory
        commits={data?.commits ?? []}
        loadedCommitCount={data?.currentCommitCount ?? COMMIT_STEP}
        totalCommitCount={data?.totalCommitCount ?? 0}
        isLoading={state !== "idle"}
        onShowMoreCommits={() => {
          loadCommits({
            objectPath: clickedObjectPath,
            contributors: selectedContributors,
            count: (data?.currentCommitCount ?? COMMIT_STEP) + COMMIT_STEP
          })
        }}
      />
    </CollapsibleHeader>
  )
}
