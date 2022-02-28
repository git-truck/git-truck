import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { LegendToggle } from "./LegendToggle"
import { useState } from "react"
import { useStore } from "../StoreContext"
import { LegendBox } from "./util"

export function Legend() {
  const { metricType, metricCaches } = useStore()
  let items = Array.from(metricCaches.get(metricType)?.legend ?? [])

  const [collapse, setCollapse] = useState<boolean>(true)
  if (items.length === 0) return null
  return (
    <LegendBox>
      <LegendFragment show={true} items={items.slice(0, 3)} />
      {items.length > 3 ? (
        <>
          <LegendFragment show={!collapse} items={items.slice(3)} />
          <LegendOther show={collapse} items={items.slice(3)} />
          <LegendToggle
            collapse={collapse}
            toggle={() => setCollapse(!collapse)}
          />
        </>
      ) : null}
    </LegendBox>
  )
}
