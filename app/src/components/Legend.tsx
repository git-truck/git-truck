import "./Legend.css"
import { Box } from "./Box"
import { Spacer } from "./Spacer"

interface LegendProps {
  entries: string[]
}

export function Legend(props: LegendProps) {
  if (props.entries.length === 0) return null
  return (
    <Box className="legend">
      {props.entries.map((entry, i) => {
        let [label, color] = entry.split("|")
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
            {i < props.entries.length - 1 ? <Spacer /> : null}
          </div>
        )
      })}
    </Box>
  )
}
