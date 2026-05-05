import { useQueryState } from "nuqs"
import { Fragment, useEffect } from "react"
import { useFetcher, href } from "react-router"
import { LegendDot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/api.contributor-distribution"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { PaginatedList } from "~/components/inspection/util/PaginatedList"
import { useSelectedCategories, useSelectedCategory } from "~/state/stores/selection"
import { missingInMapColor } from "~/const"
import { ContributorTableHeader } from "~/components/inspection/util/ContributorTableHeader"

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
  const { state, data, load, reset } = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const [branch] = useQueryState("branch")
  const { databaseInfo } = useData()

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    load(href("/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path, branch }))
    return () => {
      reset()
    }
  }, [clickedObject?.path, path, databaseInfo.contributorGroups, clickedObject, load, branch, reset])

  if (!data) {
    return (
      <div className="flex flex-col gap-2">
        <ContributorDistributionLabel />
        <h3>Loading...</h3>
      </div>
    )
  }

  return (
    <ContributorDistribution
      className={state !== "idle" ? "opacity-60" : ""}
      contributorDistribution={data.contributorDistribution}
      lineChangesSum={data.lineChangesSum}
    />
  )
}

const CONTRIBUTORS_PER_PAGE = 8

function ContributorDistributionHeader() {
  return (
    <ContributorTableHeader>
      <p>Contributor</p>
      <p className="text-right text-xs"># Line Changes</p>
      <p className="min-w-12 text-right text-xs">%</p>
    </ContributorTableHeader>
  )
}

function ContributorDistribution({
  className = "",
  contributorDistribution,
  lineChangesSum
}: {
  className?: string
  contributorDistribution: { contributor: string; contribs: number }[]
  lineChangesSum: number
}) {
  const contribSum = lineChangesSum ?? 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {contributorDistribution.length === 0 ? (
        <p>No contributors found</p>
      ) : (
        <PaginatedList
          items={contributorDistribution}
          itemsPerPage={CONTRIBUTORS_PER_PAGE}
          originalItemsCount={contributorDistribution.length}
          itemHeight={22}
          headerHeight={55}
        >
          {(shownItems) => (
            <>
              <div
                className={cn(
                  "grid grid-cols-[max-content_1fr_max-content_minmax(calc(12*var(--spacing)),max-content)] items-center justify-between gap-x-2"
                )}
              >
                <ContributorDistributionHeader />
                <ContributorDistFragment items={shownItems} contribSum={contribSum} />
              </div>
            </>
          )}
        </PaginatedList>
      )}
    </div>
  )
}

function ContributorDistFragment(props: { items: { contributor: string; contribs: number }[]; contribSum: number }) {
  const [, contributorColors] = useMetrics()
  const selectedCategories = useSelectedCategories()

  const { isSelected } = useSelectedCategory()

  return (
    <>
      {props.items.map((legendItem) => {
        const contrib = legendItem.contribs
        const contributor = legendItem.contributor
        const roundedContrib = props.contribSum == 0 ? 100 : (contrib / props.contribSum) * 100
        const contribPercentage = roundedContrib.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        })

        const hasNoSelectedCategories = selectedCategories.length === 0
        const labelIsSelected = isSelected(contributor)
        return (
          <Fragment key={contributor + contrib}>
            <div
              className={cn(
                "text-tertiary-text dark:text-tertiary-text-dark contents *:transition-opacity *:duration-200",
                {
                  "*:opacity-15": !hasNoSelectedCategories && !labelIsSelected
                }
              )}
            >
              <LegendDot
                className="my-1"
                contributorColorToChange={contributor}
                dotColor={contributorColors.get(contributor) ?? missingInMapColor}
              />
              <span className="text-secondary-text dark:text-secondary-text-dark truncate text-sm font-bold">
                {contributor}
              </span>
              <span className="text-right text-xs">{contrib.toLocaleString()}</span>
              <span className="min-w-12 text-right text-xs">{contribPercentage}%</span>
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
