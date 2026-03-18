import { useQueryState } from "nuqs"
import { useEffect, useId, useState } from "react"
import { useFetcher, href } from "react-router"
import { ChevronButton } from "~/components/ChevronButton"
import { ContributorDistFragment } from "~/components/ContributorDistFragment"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.contributor-distribution"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"

export function ContributorsInspection() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(href("/view/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path }))
    return () => {
      fetcher.reset()
    }
    // For some reason, fetcher does not have a stable identity and causes an infinite loop when added to the dependency array
    // TODO: Consider loading data on tab change instead?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path])

  if (!fetcher.data) {
    return "Loading..."
  }

  return (
    <ContributorDistribution
      className={fetcher.state !== "idle" ? "opacity-60" : ""}
      contributorDistribution={fetcher.data.contributorDistribution}
    />
  )
}

const contributorCutoff = 2

function ContributorDistribution({
  className = "",
  contributorDistribution
}: {
  className?: string
  contributorDistribution: { contributor: string; contribs: number }[]
}) {
  const contributorDistributionExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)

  const contributorsAreCutoff = (contributorDistribution?.length ?? 0) > contributorCutoff + 1
  const contribSum = !contributorDistribution
    ? 0
    : contributorDistribution.reduce((acc, curr) => acc + curr.contribs, 0)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={`flex justify-between ${contributorsAreCutoff ? "hover:text-secondary-text dark:hover:text-secondary-text-dark cursor-pointer" : ""}`}
      >
        <label className="label grow" htmlFor={contributorDistributionExpandId}>
          <h3 className="font-bold">Contributor distribution</h3>
        </label>
        {contributorsAreCutoff ? (
          <ChevronButton
            id={contributorDistributionExpandId}
            open={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-center gap-1">
        {contributorsAreCutoff ? (
          <>
            <ContributorDistFragment
              show
              items={contributorDistribution.slice(0, contributorCutoff)}
              contribSum={contribSum}
            />
            <ContributorDistFragment
              show={!collapsed}
              items={contributorDistribution.slice(contributorCutoff)}
              contribSum={contribSum}
            />
            {collapsed ? (
              <button
                className="cursor-pointer text-left text-xs opacity-70 hover:opacity-100"
                onClick={() => setCollapsed(!collapsed)}
              >
                + {(contributorDistribution?.slice(contributorCutoff) ?? []).length} more
              </button>
            ) : null}
          </>
        ) : (
          <>
            {(contributorDistribution ?? []).length > 0 && hasContributions(contributorDistribution) ? (
              <ContributorDistFragment show items={contributorDistribution ?? []} contribSum={contribSum} />
            ) : (
              <p>No contributors found</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function hasContributions(contributors?: { contributor: string; contribs: number }[] | null) {
  if (!contributors) return false
  for (const { contribs } of contributors) {
    if (contribs > 0) return true
  }
  return false
}
