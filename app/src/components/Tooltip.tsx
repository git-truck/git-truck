import { Box, BoxSubTitle } from "./util"
import { useMouse } from "react-use"
import { useRef } from "react"
import styled from "styled-components"
import { HydratedGitBlobObject } from "../../../parser/src/model"

const TooltipBox = styled(Box)`
  padding: calc(0.5 * var(--unit));
  min-width: 0;
  position: absolute;
  top: 0px;
  left: 0px;
  will-change: transform visibility;
  pointer-events: none;
`

const TooltipContainer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`

interface TooltipProps {
  hoveredBlob: HydratedGitBlobObject | null
}

export function Tooltip({ hoveredBlob }: TooltipProps) {
  const ref = useRef(document.documentElement)
  const mouse = useMouse(ref)
  return (
    <TooltipContainer>
      <TooltipBox
        style={{
          visibility: hoveredBlob === null ? "hidden" : "visible",
          transform:
            hoveredBlob === null
              ? ""
              : `translate(calc(var(--unit) + ${mouse.docX}px), calc(var(--unit) + ${mouse.docY}px))`,
        }}
      >
        <BoxSubTitle>{hoveredBlob?.name}</BoxSubTitle>
      </TooltipBox>
    </TooltipContainer>
  )
}
