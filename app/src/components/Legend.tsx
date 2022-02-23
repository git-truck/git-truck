import "./Legend.css"
import { Box } from "./Box"
import { Spacer } from "./Spacer"

interface LegendProps {
  items: string[]
}

export function Legend(props: LegendProps) {
  if (props.items.length === 0) return null
  return (
    <Box className="legend">
      {props.items.map((legendItem, i) => {
        let [label, color] = legendItem.split("|")
        return (
          <div key={`${label}${color}`}>
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
            {i < props.items.length - 1 ? <Spacer /> : null}
          </div>
        )
      })}
    </Box>
  )
}
