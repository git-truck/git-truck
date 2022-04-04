import styled from "styled-components"
import { PointInfo } from "../metrics"
import { Spacer } from "./Spacer"
import { LegendDot, LegendEntry, LegendLabel } from "./util"

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

export function LegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <LegendOtherDiv>
      <LegendEntry onClick={props.toggle}>
        {props.items.slice(0, 14).map((legendItem, i) => {
          const [label, info] = legendItem
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
      </LegendEntry>
    </LegendOtherDiv>
  )
}
