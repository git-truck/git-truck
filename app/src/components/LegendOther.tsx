import styled from "styled-components"
import { PointInfo } from "../metrics"
import { Spacer } from "./Spacer"
import { LegendDot, LegendEntry, LegendLable } from "./util"

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
        {props.items.map((legendItem, i) => {
          let [label, info] = legendItem
          let margin = i === 0 ? 0 : -10
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
        <LegendLable>{props.items.length} more</LegendLable>
      </LegendEntry>
    </LegendOtherDiv>
  )
}
