import { useQueryState } from "nuqs"
import { Fragment, useEffect } from "react"
import { useFetcher, href, useNavigation } from "react-router"
import { LegendDot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/api.contributor-distribution"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { PaginatedList } from "~/components/inspection/util/PaginatedList"
import { ShuffleColorsForm } from "~/components/forms/ShuffleColorsForm"
import { Icon } from "~/components/Icon"
import { mdiDice5 } from "@mdi/js"
import { useSelectedCategories, useSelectedCategory } from "~/state/stores/selection"
import { missingInMapColor } from "~/const"

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
  const [branch] = useQueryState("branch")
  const { databaseInfo } = useData()

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(
      href("/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path, branch })
    )
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

const CONTRIBUTORS_PER_PAGE = 8

function ContributorDistributionHeader() {
  const navigationState = useNavigation().state

  return (
    <>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
      <div className="text-primary-text dark:text-primary-text-dark contents text-sm font-bold">
        <ShuffleColorsForm>
          <button className="btn--icon m-0 mt-1 h-min text-xs" title="Shuffle contributor colors">
            <Icon
              className={cn("transition-transform duration-100 hover:rotate-20", {
                "animate-spin transition-all starting:rotate-0": navigationState !== "idle"
              })}
              path={mdiDice5}
              size="1.5em"
            />
          </button>
        </ShuffleColorsForm>
        <p>Contributor</p>
        <p className="text-right text-xs"># Line Changes</p>
        <p className="min-w-12 text-right text-xs">%</p>
      </div>
      <span className="bg-border-secondary dark:bg-border-secondary-dark col-span-full h-0.5 w-full" />
    </>
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
                  "grid grid-cols-[max-content_4fr_max-content_max-content_max-content] items-center justify-between gap-x-2"
                )}
              >
                <ContributorDistributionHeader />
              </div>
              <div
                className={cn(
                  "grid grid-cols-[max-content_4fr_max-content_max-content_max-content] items-center justify-between gap-x-2 gap-y-1"
                )}
              >
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
        const roundedContrib = (contrib / props.contribSum) * 100
        const contribPercentage =
          props.contribSum == 0
            ? "100.0"
            : roundedContrib.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              })

        const noSelectedCategories = selectedCategories.length === 0
        const labelIsSelected = isSelected(contributor)
        return (
          <Fragment key={contributor + contrib}>
            <div
              className={cn(
                "text-tertiary-text dark:text-tertiary-text-dark contents *:transition-opacity *:duration-200",
                {
                  "*:opacity-15": !noSelectedCategories && !labelIsSelected
                }
              )}
            >
              <LegendDot
                contributorColorToChange={contributor}
                dotColor={contributorColors.get(contributor) ?? missingInMapColor}
              />
              <span className="text-secondary-text dark:text-secondary-text-dark truncate text-sm font-bold">
                {contributor}
              </span>
              <span className="text-right text-xs">{contrib.toLocaleString()}</span>
              <span className="min-w-12 text-right text-xs">{contribPercentage}%</span>
              <div />
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
