import { Spacer } from "./Spacer"
import { LegendDot, LegendEntry, LegendLable } from "./util"

interface LegendOtherProps {
  items: [string, [string, number]][]
  show: boolean
}

export function LegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <LegendEntry>
      {props.items.map((legendItem, i) => {
        let [, [color]] = legendItem
        let margin = i === 0 ? 0 : -10
        return (
          <LegendDot
            style={{
              backgroundColor: color,
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
