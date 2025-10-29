import { useState } from "react"
import { LegendDot } from "../util"
import { ChevronButton } from "../ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"
import { cn } from "~/styling"
import { useMetrics } from "~/contexts/MetricContext"

const legendCutoff = 4

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
  if (items.length <= legendCutoff + 1) {
    return items.map((item) => <PointLegendEntry key={item[0]} label={item[0]} info={item[1]} />)
  } else {
    return (
      <div className="relative grid grid-flow-row grid-cols-2 gap-2">
        {shownItems.map(([label, info]) => (
          <PointLegendEntry key={label} label={label} info={info} />
        ))}
        <div className="col-span-2">
          {collapse ? (
            <PointLegendOther items={items.slice(legendCutoff)} toggle={() => setCollapse(!collapse)} />
          ) : null}
        </div>
        <ChevronButton
          className={cn("absolute top-0 right-0")}
          open={!collapse}
          onClick={() => setCollapse(!collapse)}
        />
      </div>
    )
  }
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

interface LegendOtherProps {
  toggle: () => void
  items: [string, PointInfo][]
}

function PointLegendOther(props: LegendOtherProps) {
  return (
    <button className="group w-fit hover:opacity-70" onClick={props.toggle}>
      <div className="relative mt-0.5 ml-3 flex items-center gap-2 text-sm leading-none">
        {props.items.slice(0, 14).map(([label, info]) => (
          <LegendDot
            className="-ml-3 rotate-12 transition-transform duration-300 group-hover:-rotate-12"
            key={label}
            dotColor={info.color}
          />
        ))}
        <span className="text-xs">+ {props.items.length} more</span>
      </div>
    </button>
  )
}
