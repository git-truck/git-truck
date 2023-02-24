import { memo, useMemo, useRef } from "react"
import { useMouse } from "react-use"
import type { HydratedGitBlobObject } from "~/analyzer/model"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { useCSSVar } from "../hooks"
import type { AuthorshipType, MetricType } from "../metrics/metrics"
import { dateFormatRelative } from "../util"
import { LegendDot } from "./util"

interface TooltipProps {
  hoveredBlob: HydratedGitBlobObject | null
}

export const Tooltip = memo(function Tooltip({ hoveredBlob }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType, authorshipType } = useOptions()
  const documentElementRef = useRef(document.documentElement)
  const mouse = useMouse(documentElementRef)
  const unitRaw = useCSSVar("--unit")
  const unit = unitRaw ? Number(unitRaw.replace("px", "")) : 0
  const [metricsData] = useMetrics()
  const color = useMemo(() => {
    if (!hoveredBlob) {
      return null
    }
    const colormap = metricsData[authorshipType]?.get(metricType)?.colormap
    const color = colormap?.get(hoveredBlob.path) ?? "grey"
    return color
  }, [hoveredBlob, metricsData, metricType, authorshipType])

  const toolTipWidth = tooltipRef.current ? tooltipRef.current.getBoundingClientRect().width : 0

  const sidePanelWidth =
    Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--side-panel-width-units")) || 0
  const right = mouse.docX + toolTipWidth < window.innerWidth - sidePanelWidth * unit
  const visible = hoveredBlob !== null
  const transformStyles = { transform: "none" }
  if (visible) {
    if (right)
      transformStyles.transform = `translate(calc(var(--unit) + ${mouse.docX}px), calc(var(--unit) + ${mouse.docY}px))`
    else
      transformStyles.transform = `translate(calc(var(--unit) * -1 + ${mouse.docX}px - 100%), calc(var(--unit) + ${mouse.docY}px))`
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`box absolute top-0 left-0 flex min-w-0 max-w-max place-items-center gap-2 rounded-full py-0 pl-1 pr-2 will-change-transform ${
          visible ? "visible" : "hidden"
        }`}
        ref={tooltipRef}
        style={transformStyles}
      >
        {color ? <LegendDot dotColor={color} /> : null}
        <span className="box-subtitle">{hoveredBlob?.name}</span>
        <ColorMetricDependentInfo metric={metricType} hoveredBlob={hoveredBlob} authorshipType={authorshipType} />
      </div>
    </div>
  )
})

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: HydratedGitBlobObject | null
  authorshipType: AuthorshipType
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
        ? Object.entries(props.hoveredBlob?.unionedAuthors?.[props.authorshipType] ?? [])
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
      const dominant = props.hoveredBlob?.dominantAuthor?.get(props.authorshipType) ?? undefined
      if (!dominant) return null
      return <>{dominant[0]}</>
    case "TRUCK_FACTOR":
      const authorCount = Object.entries(props.hoveredBlob?.unionedAuthors?.HISTORICAL ?? []).length
      switch (authorCount) {
        case 0:
          return null
        case 1:
          return <>1 author</>
        default:
          return <>{authorCount} authors</>
      }
    default:
      return null
  }
}
