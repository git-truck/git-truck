import { mdiFolder, mdiMenuRight } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Fragment, useMemo, useRef } from "react"
import type { GitBlobObject, GitObject, DatabaseInfo } from "~/shared/model"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, isBlob, numToFriendlyString } from "../shared/util"
import { LegendDot } from "./util"
import { useMouse } from "~/hooks"
import { cn } from "~/styling"

export function Tooltip({ className = "", hoveredObject }: { hoveredObject: GitObject | null; className?: string }) {
  const { x, y } = useMouse()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { metricType, dominantAuthorCutoff } = useOptions()
  const [metricsData] = useMetrics()
  const { databaseInfo } = useData()
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
      className={cn(
        "secondary border-border-highlight dark:border-border-highlight-dark text-primary-text dark:text-primary-text-dark bg-tertiary-bg/50 dark:bg-tertiary-bg-dark/40 absolute top-0 left-0 z-50 flex w-max flex-row place-items-center gap-2 border [background-image:none] py-0 pr-2 pl-1 text-xs backdrop-blur will-change-transform",
        className,
        {
          hidden: !visible
        }
      )}
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
      <span className="text-base-styles text-primary-text dark:text-primary-text-dark items-center text-base font-bold">
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
            databaseInfo: databaseInfo,
            dominantAuthorCutoff
          })
        : null}
    </div>
  )
}

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: GitBlobObject | null
  databaseInfo: DatabaseInfo
  dominantAuthorCutoff: number
}) {
  const slicedPath = props.hoveredBlob?.path ?? ""
  switch (props.metric) {
    case "MOST_COMMITS": {
      const noCommits = props.databaseInfo.commitCounts[slicedPath]
      if (!noCommits) return "No activity"
      return `${numToFriendlyString(noCommits)} commit${noCommits > 1 ? "s" : ""}`
    }
    case "LAST_CHANGED": {
      const epoch = props.databaseInfo.lastChanged[slicedPath]
      if (!epoch) return "No activity"
      return dateFormatRelative(epoch)
    }
    case "TOP_CONTRIBUTOR": {
      const dominant = props.databaseInfo.dominantAuthors[slicedPath]
      const contribSum = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!dominant) return "No activity"
      if (!contribSum) return <>{dominant.author}</>
      const authorPercentage = Math.round((dominant.contribcount / contribSum) * 100)
      if (authorPercentage < props.dominantAuthorCutoff) {
        // TODO show multiple authors if no dominant author
        return <>Multiple dominant authors ({authorPercentage}%)</>
      }
      return `${dominant.author} ${authorPercentage}%`
    }
    case "MOST_CONTRIBUTIONS": {
      const contribs = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!contribs) return "No activity"
      return `${numToFriendlyString(contribs)} line changes`
    }
    default: {
      return null
    }
  }
}
