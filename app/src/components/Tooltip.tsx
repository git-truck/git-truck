import { Box, BoxSubTitle } from "./util"
import { useStore } from "../StoreContext"
import { useMouse } from "react-use"
import { useRef } from "react"
import styled from "styled-components"

const TooltipBox = styled(Box)`
  padding: calc(0.5 * var(--unit));
  min-width: 0;
  position: absolute;
  top: 0px;
  left: 0px;
  will-change: transform visibility;
`

export function Tooltip() {
  const { currentHoveredBlob } = useStore()
  const ref = useRef(document.documentElement)
  const mouse = useMouse(ref)
  return (
    <TooltipBox
      style={{
        visibility: currentHoveredBlob === null ? "hidden" : "visible",
        transform:
          currentHoveredBlob === null
            ? ""
            : `translate(calc(var(--unit) + ${mouse.docX}px), calc(var(--unit) + ${mouse.docY}px))`,
      }}
    >
      <BoxSubTitle>{currentHoveredBlob?.name}</BoxSubTitle>
      {/* <p>
        <b>Location:</b>
        <Spacer />
        {currentBlob?.path}
      </p> */}
    </TooltipBox>
  )
}
