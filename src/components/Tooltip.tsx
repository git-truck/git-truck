import { memo, useMemo, useRef } from "react"
import { useMouse } from "react-use"
import type { HydratedGitBlobObject, HydratedGitObject } from "~/analyzer/model"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import { useCSSVar } from "../hooks"
import type { AuthorshipType, MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, removeRoot } from "../util"
import { LegendDot } from "./util"
import { mdiFolder, mdiMenuRight } from "@mdi/js"
import Icon from "@mdi/react"

interface TooltipProps {
  hoveredObject: HydratedGitObject | null
}

export const Tooltip = memo(function Tooltip({ hoveredObject }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType, authorshipType } = useOptions()
  const documentElementRef = useRef(document.documentElement)
  const mouse = useMouse(documentElementRef)
  const unitRaw = useCSSVar("--unit")
  const unit = unitRaw ? Number(unitRaw.replace("px", "")) : 0
  const [metricsData] = useMetrics()
  const color = useMemo(() => {
    if (!hoveredObject) {
      return null
    }
    const colormap = metricsData[authorshipType]?.get(metricType)?.colormap
    const color = colormap?.get(hoveredObject.path) ?? "grey"
    return color
  }, [hoveredObject, metricsData, metricType, authorshipType])

  const toolTipWidth = tooltipRef.current ? tooltipRef.current.getBoundingClientRect().width : 0

  const sidePanelWidth =
    Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue("--side-panel-width-units")) || 0
  const right = mouse.docX + toolTipWidth < window.innerWidth - sidePanelWidth * unit
  const visible = hoveredObject !== null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`card absolute top-0 left-0 flex min-w-0 max-w-max flex-row place-items-center rounded-full py-0 pl-1 pr-2 will-change-transform ${
          visible ? "visible" : "hidden"
        }`}
        ref={tooltipRef}
        style={{
          transform: !visible
            ? "none"
            : right
            ? `translate(calc(1rem + ${mouse.docX}px), calc(1rem + ${mouse.docY}px))`
            : `translate(calc(-1rem + ${mouse.docX}px - 100%), calc(1rem + ${mouse.docY}px))`,
        }}
      >
        {hoveredObject?.type === "blob" ? (
          color ? (
            <LegendDot dotColor={color} />
          ) : null
        ) : (
          <Icon className="ml-0.5" path={mdiFolder} size={0.75} />
        )}
        <span className="card__subtitle items-center">
          {hoveredObject?.type === "blob"
            ? hoveredObject?.name
            : allExceptFirst(hoveredObject?.path.split("/") ?? []).map((segment, index, segments) => (
                <>
                  {segment}
                  {segments.length > 1 && index < segments.length - 1 ? (
                    <>
                      <Icon path={mdiMenuRight} size={1} />
                    </>
                  ) : null}
                </>
              ))}
        </span>
        {hoveredObject?.type === "blob" ? (
          <ColorMetricDependentInfo
            metric={metricType}
            hoveredBlob={hoveredObject as HydratedGitBlobObject}
            authorshipType={authorshipType}
          />
        ) : null}
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
