import { useState } from "react"
import { ExpandUp } from "../Toggle"
import type { MetricLegendProps } from "./Legend"
import { Spacer } from "../Spacer"
import { LegendDot, LegendLabel } from "../util"
import styled from "styled-components"

const legendCutoff = 3

export class PointInfo {
  constructor(public readonly color: string, public weight: number) {}

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
        <ExpandUp collapse={collapse} toggle={() => setCollapse(!collapse)} />
      </>
    )
  }
}

interface PointLegendFragProps {
  items: [string, PointInfo][]
  show: boolean
}

function PointLegendFragment(props: PointLegendFragProps) {
  if (!props.show) return null
  return (
    <>
      {props.items.map((legendItem) => {
        const [label, info] = legendItem
        return (
          <div key={label}>
            <div className="relative flex items-center text-sm leading-none">
              <LegendDot dotColor={info.color} />
              <Spacer horizontal />
              <LegendLabel>{label}</LegendLabel>
            </div>
            <Spacer />
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

const LegendOtherDiv = styled.div`
  width: fit-content;
  &:hover {
    cursor: pointer;
  }
`

function PointLegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <LegendOtherDiv>
      <div className="relative flex items-center text-sm leading-none" onClick={props.toggle}>
        {props.items.slice(0, 14).map(([label, info], i) => {
          const margin = i === 0 ? 0 : -10
          return (
            <LegendDot
              key={`dot${label}`}
              dotColor={info.color}
              style={{
                marginLeft: margin,
              }}
            />
          )
        })}
        <Spacer horizontal />
        <LegendLabel>{props.items.length} more</LegendLabel>
      </div>
    </LegendOtherDiv>
  )
}
