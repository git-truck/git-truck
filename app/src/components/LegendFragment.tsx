import "./Legend.css"
import { Box } from "./util"
import { Spacer } from "./Spacer"

interface LegendFragProps {
  items: string[]
  show: boolean
}

export function LegendFragment(props: LegendFragProps) {
  if (!props.show) return null
  return (
    <div>
      {props.items.map((legendItem, i) => {
        let [label, color] = legendItem.split("|")
        return (
          <>
            <div className="legend-entry">
              <div
                className="legend-dot"
                style={{
                  backgroundColor: color,
                }}
              ></div>
              <Spacer horizontal />
              <p className="legend-label">{label}</p>
            </div>
            <Spacer />
          </>
        )
      })}
    </div>
  )
}
