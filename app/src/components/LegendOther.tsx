import "./Legend.css"
import { Box } from "./util"
import { Spacer } from "./Spacer"
import { MutableRefObject } from "react"

interface LegendOtherProps {
  items: string[]
  show: boolean
}

export function LegendOther(props: LegendOtherProps) {
  if (!props.show) return null

  return (
    <div className="legend-entry">
      {props.items.map((legendItem, i) => {
        let [, color] = legendItem.split("|")
        let margin = i === 0 ? 0 : -10
        return (
          <div
            className="legend-dot"
            style={{
              backgroundColor: color,
              marginLeft: margin,
            }}
          ></div>
        )
      })}
      <Spacer horizontal />
      <p className="legend-label">Other</p>
    </div>
  )
}
