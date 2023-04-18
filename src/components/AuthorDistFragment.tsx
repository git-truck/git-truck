import { Fragment } from "react"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { Spacer } from "./Spacer"
import { LegendDot } from "./util"

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
            <div
              className="flex items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold"
              title={author}
            >
              {metricType == "TOP_CONTRIBUTOR" ? (
                <>
                  <LegendDot dotColor={authorColors.get(author) ?? "white"} />
                  <Spacer horizontal />
                </>
              ) : null}
              <span className="overflow-hidden overflow-ellipsis whitespace-pre font-bold" style={{ opacity: 0.7 }}>
                {author}
              </span>
            </div>
            <p className="break-all text-sm">{roundedContrib === 0 ? "<1" : roundedContrib}%</p>
          </Fragment>
        )
      })}
    </>
  )
}
