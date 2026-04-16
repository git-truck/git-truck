import { useQueryState } from "nuqs"
import { Fragment, useEffect, useId, useState } from "react"
import { useFetcher, href } from "react-router"
import { ChevronButton } from "~/components/ChevronButton"
import { LegendDot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.contributor-distribution"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"

function ContributorDistributionLabel({ htmlFor }: { htmlFor?: string }) {
  return (
    <label className="label grow" htmlFor={htmlFor}>
      <h3 className="font-bold">Contributor distribution</h3>
      <p className="text-secondary-text dark:text-secondary-text-dark text-xs font-normal">
        Shows contributor&apos;s share of line changes to selected file or folder.
      </p>
    </label>
  )
}

export function ContributorsInspection() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const { databaseInfo } = useData()

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(href("/view/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path }))
    return () => {
      fetcher.reset()
    }
    // For some reason, fetcher does not have a stable identity and causes an infinite loop when added to the dependency array
    // TODO: Consider loading data on tab change instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path, path, databaseInfo.contributorGroups])

  if (!fetcher.data) {
    return (
      <div className="flex flex-col gap-2">
        <ContributorDistributionLabel />
        <h3>Loading...</h3>
      </div>
    )
  }

  return (
    <ContributorDistribution
      className={fetcher.state !== "idle" ? "opacity-60" : ""}
      contributorDistribution={fetcher.data.contributorDistribution}
      lineChangesSum={fetcher.data.lineChangesSum}
    />
  )
}

const contributorCutoff = 2

function ContributorDistribution({
  className = "",
  contributorDistribution,
  lineChangesSum
}: {
  className?: string
  contributorDistribution: { contributor: string; contribs: number }[]
  lineChangesSum: number
}) {
  const contributorDistributionExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)

  const contributorsAreCutoff = contributorDistribution.length > contributorCutoff + 1
  //ContribSum > sum(Contribs) if there are coauthors
  const contribSum = lineChangesSum ?? 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={`flex justify-between ${contributorsAreCutoff ? "hover:text-secondary-text dark:hover:text-secondary-text-dark cursor-pointer" : ""}`}
      >
        <ContributorDistributionLabel htmlFor={contributorDistributionExpandId} />
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
                + {contributorDistribution.slice(contributorCutoff).length} more
              </button>
            ) : null}
          </>
        ) : (
          <>
            {contributorDistribution.length > 0 ? (
              <ContributorDistFragment show items={contributorDistribution} contribSum={contribSum} />
            ) : (
              <p>No contributors found</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ContributorDistFragment(props: {
  items: { contributor: string; contribs: number }[]
  show: boolean
  contribSum: number
}) {
  const [, contributorColors] = useMetrics()

  if (!props.show) return null

  return (
    <>
      {props.items.map((legendItem) => {
        const contrib = legendItem.contribs
        const contributor = legendItem.contributor
        const roundedContrib = Math.round((contrib / props.contribSum) * 100)
        const contribPercentage = props.contribSum == 0 ? "100" : roundedContrib === 0 ? "<1" : roundedContrib
        return (
          <Fragment key={contributor + contrib}>
            <div className="flex items-center gap-1">
              <LegendDot
                contributorColorToChange={contributor}
                dotColor={contributorColors.get(contributor) ?? "grey"}
              />
              <span className="overflow-hidden text-sm font-bold text-ellipsis whitespace-pre">{contributor}</span>
            </div>
            <span className="text-right text-sm break-all">{contribPercentage}%</span>
          </Fragment>
        )
      })}
    </>
  )
}
