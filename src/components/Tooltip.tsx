import { Box, BoxSubTitle, LegendDot } from "./util"
import { useMouse } from "react-use"
import { useMemo, useRef } from "react"
import styled from "styled-components"
import { HydratedGitBlobObject } from "~/analyze/model"
import { useOptions } from "../contexts/OptionsContext"
import { Spacer } from "./Spacer"
import { useMetricCaches } from "../contexts/MetricContext"
import { MetricType } from "../metrics"
import { useCSSVar } from "../hooks"
import { dateFormatRelative } from "../util"

const TooltipBox = styled(Box)<{
  visible: boolean
  right: boolean
}>`
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
  const tooltipContainerRef = useRef<HTMLDivElement>(null)
  const { metricType } = useOptions()
  const documentElementRef = useRef(document.documentElement)
  const mouse = useMouse(documentElementRef)
  const unitRaw = useCSSVar("--unit")
  const unit = unitRaw ? Number(unitRaw.replace("px", "")) : 0
  const metricCaches = useMetricCaches()
  const color = useMemo(() => {
    if (!hoveredBlob) {
      return null
    }
    const { colormap } = metricCaches.get(metricType)!
    const color = colormap.get(hoveredBlob.path)
    return color
  }, [hoveredBlob, metricCaches, metricType])
  const toolTipWidth = tooltipContainerRef.current
    ? tooltipContainerRef.current.getBoundingClientRect().width
    : 0

  const right = mouse.docX + toolTipWidth < window.innerWidth - 3 * unit

  const visible = hoveredBlob !== null
  const transformStyles = { transform: "none" }
  if (visible) {
    if (right)
      transformStyles.transform = `translate(calc(var(--unit) + ${mouse.docX}px), calc(var(--unit) + ${mouse.docY}px))`
    else
      transformStyles.transform = `translate(calc(var(--unit) * -1 + ${mouse.docX}px - 100%), calc(var(--unit) + ${mouse.docY}px))`
  }

  return (
    <TooltipContainer>
      <TooltipBox
        ref={tooltipContainerRef}
        right={right}
        visible={visible}
        style={transformStyles}
      >
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
    case "MOST_COMMITS":
      const noCommits = props.hoveredBlob?.noCommits
      if (!noCommits) return null
      return (
        <>
          {noCommits} commit{noCommits > 1 ? <>s</> : null}
        </>
      )
    case "LAST_CHANGED":
      const epoch = props.hoveredBlob?.lastChangeEpoch
      if (!epoch) return null
      return <>{dateFormatRelative(epoch)}</>
    case "SINGLE_AUTHOR":
      const authors = props.hoveredBlob
        ? Object.entries(props.hoveredBlob?.unionedAuthors ?? [])
        : []
      switch (authors.length) {
        case 0:
          return null
        case 1:
          return <>{authors[0][0]} is the only author</>
        default:
          return <>{authors.length} authors</>
      }
    case "TOP_CONTRIBUTOR":
      const dominant = props.hoveredBlob?.dominantAuthor
      if (!dominant) return null
      return <>{dominant[0]}</>
    default:
      return null
  }
}
