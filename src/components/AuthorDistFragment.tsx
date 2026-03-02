import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { LegendDot } from "~/components/util"

interface AuthorDistFragProps {
  items: { author: string; contribs: number }[]
  show: boolean
  contribSum: number
}

export function AuthorDistFragment(props: AuthorDistFragProps) {
  const [, authorColors] = useMetrics()

  if (!props.show) return null

  return (
    <>
      {props.items.map((legendItem) => {
        const contrib = legendItem.contribs
        const author = legendItem.author
        const roundedContrib = Math.round((contrib / props.contribSum) * 100)
        const contribPercentage = roundedContrib === 0 ? "<1" : roundedContrib
        return (
          <Fragment key={author + contrib}>
            <div className="flex items-center gap-1">
              <LegendDot authorColorToChange={author} dotColor={authorColors.get(author) ?? "grey"} />
              <span className="overflow-hidden text-sm font-bold text-ellipsis whitespace-pre">{author}</span>
            </div>
            <span className="text-right text-sm break-all">{contribPercentage}%</span>
          </Fragment>
        )
      })}
    </>
  )
}
