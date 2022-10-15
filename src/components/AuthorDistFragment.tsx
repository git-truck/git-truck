import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { DetailsKey, DetailsValue, LegendDot, LegendLabel } from "./util"

interface AuthorDistFragProps {
  items: [string, number][]
  show: boolean
}

export function AuthorDistFragment(props: AuthorDistFragProps) {
  const [, authorColors] = useMetrics()

  if (!props.show) return null

  return (
    <>
      {props.items.map((legendItem) => {
        const [author, contrib] = legendItem
        const roundedContrib = Math.round(contrib * 100)
        return (
          <Fragment key={author + contrib}>
            <DetailsKey title={author} grow>
              <LegendDot dotColor={authorColors.get(author) ?? "white"} />
              <LegendLabel>{author}</LegendLabel>
            </DetailsKey>
            <DetailsValue>{roundedContrib === 0 ? "<1" : roundedContrib}%</DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}
