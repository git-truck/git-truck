import { Box, BoxSubTitle, LegendDot } from "./util"
import { useMouse } from "react-use"
import { useMemo, useRef } from "react"
import styled from "styled-components"
import { HydratedGitBlobObject } from "../../../parser/src/model"
import { useOptions } from "../OptionsContext"
import { Spacer } from "./Spacer"
import { useMetricCaches } from "../MetricContext"

const TooltipBox = styled(Box)<{ x: number; y: number; visible: boolean }>`
  padding: calc(0.5 * var(--unit)) var(--unit);
  min-width: 0;
  width: max-content;
  position: absolute;
  top: 0px;
  left: 0px;
  will-change: transform visibility;
  display: flex;
  border-radius: calc(2 * var(--unit));
  align-items: center;

  pointer-events: none;
  visibility: ${({ visible }) => (visible ? "visible" : "hidden")};
  transform: ${({ visible, x, y }) =>
    visible
      ? `translate(calc(var(--unit) + ${x}px), calc(var(--unit) + ${y}px))`
      : "none"};
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
  const { metricType } = useOptions()
  const metricCaches = useMetricCaches()
  const color = useMemo(() => {
    if (!hoveredBlob) {
      return null
    }
    const { colormap } = metricCaches.get(metricType)!
    const color = colormap.get(hoveredBlob.path)
    return color
  }, [hoveredBlob, metricCaches, metricType])
  const ref = useRef(document.documentElement)

  const mouse = useMouse(ref)
  return (
    <TooltipContainer>
      <TooltipBox visible={hoveredBlob !== null} x={mouse.docX} y={mouse.docY}>
        {color ? <LegendDot dotColor={color} /> : null}
        <Spacer horizontal />
        <BoxSubTitle>{hoveredBlob?.name}</BoxSubTitle>
      </TooltipBox>
    </TooltipContainer>
  )
}
