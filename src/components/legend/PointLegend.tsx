import { useState } from "react"
import { LegendDot } from "../util"
import { ChevronButton } from "../ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"
import { useMetrics } from "~/contexts/MetricContext"

const legendCutoff = 8

export class PointInfo {
  public readonly color: `#${string}`
  public weight: number

  constructor(color: `#${string}`, weight: number) {
    this.color = color
    this.weight = weight
  }

  add(value: number) {
    this.weight += value
  }
}

export type PointLegendData = Map<string, PointInfo>

export function PointLegend() {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")

  const [collapse, setCollapse] = useState<boolean>(true)

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  const shownItems = items.slice(0, collapse ? legendCutoff : items.length)

  if (items.length === 0) return null

  return (
    <div className="relative grid grid-cols-2 gap-2">
      {shownItems.map(([label, info]) => (
        <PointLegendEntry key={label} label={label} info={info} />
      ))}
      {items.length > legendCutoff ? (
        <PointLegendOther items={items.slice(legendCutoff)} collapse={collapse} toggle={() => setCollapse(!collapse)} />
      ) : null}
    </div>
  )
}

function PointLegendEntry({ label, info }: { label: string; info: PointInfo }) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  return (
    <div key={label} className="relative flex items-center gap-1 text-sm leading-none">
      {isAuthorRelatedLegend ? (
        <LegendDot dotColor={info.color} authorColorToChange={label} />
      ) : (
        <LegendDot dotColor={info.color} />
      )}
      <span className="truncate font-bold" title={label}>
        {label}
      </span>
    </div>
  )
}

function PointLegendOther({
  toggle,
  items,
  collapse
}: {
  toggle: () => void
  items: [string, PointInfo][]
  collapse: boolean
}) {
  return (
    <ChevronButton
      size={0.75}
      className="group col-span-full flex items-center gap-2 hover:opacity-80"
      open={!collapse}
      title={collapse ? "Show more" : "Show less"}
      onClick={toggle}
    >
      {collapse ? (
        <>
          <div className="ml-3 flex gap-2">
            {items.slice(0, 14).map(([label, info]) => (
              <LegendDot
                className="-ml-3 rotate-12 transition-transform duration-300 group-hover:-rotate-12"
                key={label}
                dotColor={info.color}
              />
            ))}
          </div>
          {/* <span className="text-xs">+{items.length} more</span> */}
          <span className="text-xs">Show {items.length.toLocaleString()} more</span>
        </>
      ) : (
        <span className="text-xs">Show less</span>
      )}
    </ChevronButton>
  )
}
