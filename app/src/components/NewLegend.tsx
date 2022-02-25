import "./Legend.css"
import { Box } from "./util"
import { Spacer } from "./Spacer"
import { LegendFragment } from "./LegendFragment"
import { LegendOther } from "./LegendOther"
import { LegendToggle } from "./LegendToggle"
import { useState } from "react"

interface LegendProps {
  items: string[]
}

export function NewLegend(props: LegendProps) {
  const [collapse, setCollapse] = useState<boolean>(true)
  if (props.items.length === 0) return null
  return (
    <Box className="legend">
      <LegendFragment show={true} items={props.items.slice(0, 3)} />
      {props.items.length > 3 ? (
        <>
          <LegendFragment show={!collapse} items={props.items.slice(3)} />
          <LegendOther show={collapse} items={props.items.slice(3)} />
          <LegendToggle
            collapse={collapse}
            toggle={() => setCollapse(!collapse)}
          />
        </>
      ) : null}
    </Box>
  )
}
