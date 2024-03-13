import { Fragment, memo, useMemo, useRef } from "react"
import type { GitBlobObject, GitObject } from "~/analyzer/model"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, isBlob, removeFirstPart } from "../util"
import { LegendDot } from "./util"
import { mdiFolder, mdiMenuRight } from "@mdi/js"
import Icon from "@mdi/react"
import { useData } from "~/contexts/DataContext"
import type { RepoData2 } from "~/routes/$repo.$"

interface TooltipProps {
  hoveredObject: GitObject | null
  x: number
  y: number
  w: number
}

export const Tooltip = memo(function Tooltip({ hoveredObject, x, y }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()
  const { repodata2 } = useData()
  const color = useMemo(() => {
    if (!hoveredObject) {
      return null
    }
    const colormap = metricsData.get(metricType)?.colormap
    const color = colormap?.get(hoveredObject.path) ?? "grey"
    return color
  }, [hoveredObject, metricsData, metricType])

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
            hoveredBlob: hoveredObject,
            repodata2
          })
        : null}
    </div>
  )
})

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: GitBlobObject | null
  repodata2: RepoData2
}) {
  const slicedPath = removeFirstPart(props.hoveredBlob?.path ?? "")
  const authorCount = props.repodata2.authorCounts.get(slicedPath)
  switch (props.metric) {
    case "MOST_COMMITS":
      const noCommits = props.repodata2.commitCounts.get(slicedPath)
      if (!noCommits) return "No activity"
      return `${noCommits} commit${noCommits > 1 ? "s" : ""}`
    case "LAST_CHANGED":
      const epoch = props.repodata2.lastChanged.get(slicedPath)
      if (!epoch) return "No activity"
      return <>{dateFormatRelative(epoch)}</>
    case "SINGLE_AUTHOR":
      switch (authorCount) {
        case undefined:
        case 0:
          return "No activity"
        case 1:
          const dom = props.repodata2.dominantAuthors.get(slicedPath)
          if (!dom) return null
          return `${dom} is the only author`
        default:
          return `${authorCount} authors`
      }
    case "TOP_CONTRIBUTOR":
      const dominant = props.repodata2.dominantAuthors.get(slicedPath)
      if (!dominant) return "No activity"
      return <>{dominant}</>
    case "TRUCK_FACTOR":
      switch (authorCount) {
        case undefined:
        case 0:
          return "No activity"
        case 1:
          return "1 author"
        default:
          return `${authorCount} authors`
      }
    default:
      return null
  }
}
