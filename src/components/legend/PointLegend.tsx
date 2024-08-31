import { useState } from "react"
import type { MetricLegendProps } from "./Legend"
import { LegendDot } from "../util"
import { ChevronButton } from "../ChevronButton"
import { useOptions } from "~/contexts/OptionsContext"

const legendCutoff = 3

export class PointInfo {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    public readonly color: `#${string}`,
    public weight: number
  ) {}

  add(value: number) {
    this.weight += value
  }
}

export type PointLegendData = Map<string, PointInfo>

export function PointLegend({ metricCache }: MetricLegendProps) {
  const [collapse, setCollapse] = useState<boolean>(true)

  const items = Array.from(metricCache.legend as PointLegendData).sort(([, info1], [, info2]) => {
    if (info1.weight < info2.weight) return 1
    if (info1.weight > info2.weight) return -1
    return 0
  })

  if (items.length === 0) return null
  if (items.length <= legendCutoff + 1) {
    return <PointLegendFragment show={true} items={items} />
  } else {
    return (
      <>
        <PointLegendFragment show={true} items={items.slice(0, legendCutoff)} />
        <PointLegendFragment show={!collapse} items={items.slice(legendCutoff)} />
        <PointLegendOther show={collapse} items={items.slice(legendCutoff)} toggle={() => setCollapse(!collapse)} />
        <ChevronButton className="absolute bottom-2 right-2" open={!collapse} onClick={() => setCollapse(!collapse)} />
      </>
    )
  }
}

interface PointLegendFragProps {
  items: [string, PointInfo][]
  show: boolean
}

function PointLegendFragment(props: PointLegendFragProps) {
  const { metricType } = useOptions()
  const isAuthorRelatedLegend = metricType === "TOP_CONTRIBUTOR"

  if (!props.show) return null
  return (
    <>
      {props.items.map((legendItem) => {
        const [label, info] = legendItem
        return (
          <div key={label}>
            <div className="relative flex items-center gap-2 text-sm leading-none">
              {isAuthorRelatedLegend ? (
                <LegendDot dotColor={info.color} authorColorToChange={label} />
              ) : (
                <LegendDot dotColor={info.color} />
              )}
              <span className="font-bold">{label}</span>
            </div>
          </div>
        )
      })}
    </>
  )
}

interface LegendOtherProps {
  toggle: () => void
  items: [string, PointInfo][]
  show: boolean
}

function PointLegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <button className="w-fit hover:opacity-70" onClick={props.toggle}>
      <div className="relative flex items-center gap-2 text-sm leading-none">
        {props.items.slice(0, 14).map(([label, info], i) => {
          const margin = i === 0 ? 0 : -16
          return (
            <LegendDot
              key={`dot${label}`}
              dotColor={info.color}
              style={{
                marginLeft: margin
              }}
            />
          )
        })}
        <span className="font-bold">{props.items.length} more</span>
      </div>
    </button>
  )
}
