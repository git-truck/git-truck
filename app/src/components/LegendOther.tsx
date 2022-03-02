import { PointInfo } from "../metrics"
import { Spacer } from "./Spacer"
import { LegendDot, LegendEntry, LegendLable } from "./util"

interface LegendOtherProps {
  items: [string, PointInfo][]
  show: boolean
}

export function LegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <LegendEntry>
      {props.items.map((legendItem, i) => {
        let [, info] = legendItem
        let margin = i === 0 ? 0 : -10
        return (
          <LegendDot
            dotColor={info.color}
            style={{
              marginLeft: margin,
            }}
          />
        )
      })}
      <Spacer horizontal />
      <LegendLable>Other</LegendLable>
    </LegendEntry>
  )
}
