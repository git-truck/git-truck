import { Fragment, memo, useMemo, useRef } from "react"
import type { HydratedGitBlobObject, HydratedGitObject } from "~/analyzer/model"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import type { AuthorshipType, MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, isBlob } from "../util"
import { LegendDot } from "./util"
import { mdiFolder, mdiMenuRight } from "@mdi/js"
import Icon from "@mdi/react"

interface TooltipProps {
  hoveredObject: HydratedGitObject | null
  x: number
  y: number
  w: number
}

export const Tooltip = memo(function Tooltip({ hoveredObject, x, y }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType, authorshipType } = useOptions()
  const [metricsData] = useMetrics()
  const color = useMemo(() => {
    if (!hoveredObject) {
      return null
    }
    const colormap = metricsData[authorshipType]?.get(metricType)?.colormap
    const color = colormap?.get(hoveredObject.path) ?? "grey"
    return color
  }, [hoveredObject, metricsData, metricType, authorshipType])

  const right = useMemo(() => x < window.innerWidth / 2, [x])
  const top = useMemo(() => y < window.innerHeight / 2, [y])
  const xTransform = useMemo(() => (right ? `calc(1rem + ${x}px)` : `calc(-1rem + ${x}px - 100%)`), [right, x])
  const yTransform = useMemo(() => (top ? `calc(1rem + ${y}px)` : `calc(-1rem + ${y}px - 100%)`), [top, y])
  const visible = hoveredObject !== null

  return (
    <div
      className={`card absolute left-0 top-0 flex w-max flex-row place-items-center rounded-full py-0 pl-1 pr-2 will-change-transform ${
        visible ? "visible" : "hidden"
      }`}
      ref={tooltipRef}
      style={{
        transform: visible ? `translate(${xTransform}, ${yTransform})` : "none"
      }}
    >
      {hoveredObject?.type === "blob" ? (
        color ? (
          <LegendDot dotColor={color} />
        ) : null
      ) : (
        <Icon className="ml-0.5" path={mdiFolder} size={0.75} />
      )}
      <span className="card__subtitle items-center font-bold">
        {hoveredObject && isBlob(hoveredObject)
          ? hoveredObject?.name
          : allExceptFirst(hoveredObject?.path.split("/") ?? []).map((segment, index, segments) => (
              <Fragment key={`segment-${index}${segment}`}>
                {segment}
                {segments.length > 1 && index < segments.length - 1 ? <Icon path={mdiMenuRight} size={1} /> : null}
              </Fragment>
            ))}
      </span>
      {hoveredObject?.type === "blob"
        ? ColorMetricDependentInfo({
            metric: metricType,
            hoveredBlob: hoveredObject as HydratedGitBlobObject,
            authorshipType: authorshipType
          })
        : null}
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
      return `${noCommits} commit${noCommits > 1 ? "s" : ""}`
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
          return `${authors[0][0]} is the only author`
        default:
          return `${authors.length} authors`
      }
    case "TOP_CONTRIBUTOR":
      const dominant = props.hoveredBlob?.dominantAuthor?.[props.authorshipType] ?? undefined
      if (!dominant) return null
      return <>{dominant[0]}</>
    case "TRUCK_FACTOR":
      const authorCount = Object.entries(props.hoveredBlob?.unionedAuthors?.HISTORICAL ?? []).length
      switch (authorCount) {
        case 0:
          return null
        case 1:
          return "1 author"
        default:
          return `${authorCount} authors`
      }
    default:
      return null
  }
}
