import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { LegendDot } from "~/components/util"

export function ContributorDistFragment(props: {
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
        const contribPercentage = roundedContrib === 0 ? "<1" : roundedContrib
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
