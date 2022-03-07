import { Box, BoxSubTitle, LegendDot } from "./util"
import { useMouse } from "react-use"
import { useMemo, useRef } from "react"
import styled from "styled-components"
import { HydratedGitBlobObject } from "../../../parser/src/model"
import { useOptions } from "../OptionsContext"
import { Spacer } from "./Spacer"
import { useMetricCaches } from "../MetricContext"
import { MetricType } from "../metrics"
import { dateFormatShort } from "../util"

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
        <Spacer horizontal />
        <ColorMetricDependentInfo
          metric={metricType}
          hoveredBlob={hoveredBlob}
        />
      </TooltipBox>
    </TooltipContainer>
  )
}

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: HydratedGitBlobObject | null
}) {
  switch (props.metric) {
    case "HEAT_MAP":
      return <>changed in {props.hoveredBlob?.noCommits} commits</>
    case "COLD_MAP":
      return (
        <>last changed {dateFormatShort(props.hoveredBlob?.lastChangeEpoch)}</>
      )
    case "DOMINATED":
      const authors = props.hoveredBlob
        ? Object.entries(props.hoveredBlob?.authors)
        : []
      switch (authors.length) {
        case 0:
          return <></>
        case 1:
          return <>dominated by {authors[0][0]}</>
        default:
          return <>has {authors.length} authors</>
      }
    default:
      return <></>
  }
}
