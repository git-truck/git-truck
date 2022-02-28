import { Spacer } from "./Spacer"
import { LegendDot, LegendEntry, LegendLable } from "./util"

interface LegendOtherProps {
  items: string[]
  show: boolean
}

export function LegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <LegendEntry>
      {props.items.map((legendItem, i) => {
        let [, color] = legendItem.split("|")
        let margin = i === 0 ? 0 : -10
        return (
          <LegendDot
            dotColor={color}
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
