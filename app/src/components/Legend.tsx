import "./Legend.css"
import { Box } from "./util"
import { Spacer } from "./Spacer"
import { useStore } from "../StoreContext"

export function Legend() {
  const store = useStore()
  const items = Array.from(
    store.metricCaches.get(store.metricType)?.legend ?? []
  )

  if (items.length === 0) return null
  return (
    <Box className="legend">
      {items.map((legendItem, i) => {
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
            {i < items.length - 1 ? <Spacer /> : null}
          </div>
        )
      })}
    </Box>
  )
}
