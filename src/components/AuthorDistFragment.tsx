import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { Spacer } from "./Spacer"
import { DetailsKey, DetailsValue, LegendDot } from "./util"

interface AuthorDistFragProps {
  items: [string, number][]
  show: boolean
}

export function AuthorDistFragment(props: AuthorDistFragProps) {
  const [, authorColors] = useMetrics()
  const { metricType } = useOptions()

  if (!props.show) return null

  return (
    <>
      {props.items.map((legendItem) => {
        const [author, contrib] = legendItem
        const roundedContrib = Math.round(contrib * 100)
        return (
          <Fragment key={author + contrib}>
            <DetailsKey title={author} grow>
              {metricType == "TOP_CONTRIBUTOR" ? (
                <>
                  <LegendDot dotColor={authorColors.get(author) ?? "white"} />
                  <Spacer horizontal />
                </>
              ) : null}
              <span className="overflow-hidden overflow-ellipsis whitespace-pre font-bold" style={{ opacity: 0.7 }}>
                {author}
              </span>
            </DetailsKey>
            <DetailsValue>{roundedContrib === 0 ? "<1" : roundedContrib}%</DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}
