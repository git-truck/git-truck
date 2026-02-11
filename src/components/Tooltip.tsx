import {
  mdiAccount,
  mdiAccountGroup,
  mdiChevronRight,
  mdiCircleSmall,
  mdiFileOutline,
  mdiPlusMinusVariant,
  mdiPulse,
  mdiResize,
  mdiSourceCommit
} from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Fragment, useMemo, useRef } from "react"
import type { GitBlobObject, GitObject, DatabaseInfo } from "~/shared/model"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import { useOptions } from "../contexts/OptionsContext"
import type { MetricType } from "../metrics/metrics"
import { allExceptFirst, dateFormatRelative, isBlob, isDarkColor, isTree, numToFriendlyString } from "../shared/util"

import { useMouse } from "~/hooks"
import { cn } from "~/styling"
import { missingInMapColor } from "~/const"
import type { SizeMetricType } from "~/metrics/sizeMetric"

export function Tooltip({ className = "", hoveredObject }: { hoveredObject: GitObject | null; className?: string }) {
  const { x, y } = useMouse()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { sizeMetric, metricType, dominantAuthorCutoff } = useOptions()
  const [metricsData] = useMetrics()
  const { databaseInfo } = useData()
  const color = hoveredObject ? metricsData.get(metricType)?.colormap?.get(hoveredObject.path) : missingInMapColor

  const right = useMemo(() => x < window.innerWidth / 2, [x])
  const top = useMemo(() => y < window.innerHeight / 2, [y])
  const xTransform = useMemo(() => (right ? `calc(1rem + ${x}px)` : `calc(-0.5rem + ${x}px - 100%)`), [right, x])
  const yTransform = useMemo(() => (top ? `calc(1rem + ${y}px)` : `calc(-0.5rem + ${y}px - 100%)`), [top, y])
  const visible = hoveredObject !== null

  return (
    <div
      className={cn(
        "secondary border-primary-bg dark:border-primary-bg-dark bg-primary-bg/50 dark:bg-primary-bg-dark/40 absolute top-0 left-0 z-50 flex w-min max-w-sm flex-wrap gap-0.5 border bg-none py-0.5 pr-2 pl-1 text-xs backdrop-blur will-change-transform select-none backface-hidden",
        className,
        {
          hidden: !visible,
          "font-bold": isTree(hoveredObject)
        },
        isBlob(hoveredObject) && color
          ? isDarkColor(color).luminance >= 0.5
            ? "text-primary-text"
            : "text-primary-text-dark"
          : "dark:text-primary-text-dark text-primary-text"
      )}
      ref={tooltipRef}
      style={{
        transform: visible ? `translateX(${xTransform}) translateY(${yTransform}) translateZ(0)` : "none",
        ...(color ? { backgroundColor: `hsl(from ${color} h s l / 0.7)` } : {})
      }}
    >
      <span className="flex w-max place-items-center gap-1">
        {hoveredObject && isBlob(hoveredObject)
          ? hoveredObject?.name
          : allExceptFirst(hoveredObject?.path.split("/") ?? []).map((segment, index, segments) => (
              <Fragment key={`segment-${index}${segment}`}>
                {segment}
                {segments.length > 1 && index < segments.length - 1 ? (
                  <Icon path={mdiChevronRight} className="opacity-50" size={0.5} />
                ) : null}
              </Fragment>
            ))}
      </span>
      {hoveredObject?.type === "blob" ? (
        <div className="flex w-max flex-col gap-1">
          <div className="flex gap-1">
            <ColorMetricDependentInfo
              metric={metricType}
              hoveredBlob={hoveredObject}
              databaseInfo={databaseInfo}
              dominantAuthorCutoff={dominantAuthorCutoff}
            />
          </div>
          {metricType !== sizeMetric ? (
            <div className="flex gap-1">
              <SizeMetricDependentInfo
                sizeMetric={sizeMetric}
                databaseInfo={databaseInfo}
                hoveredBlob={hoveredObject}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ColorMetricDependentInfo(props: {
  metric: MetricType
  hoveredBlob: GitBlobObject | null
  databaseInfo: DatabaseInfo
  dominantAuthorCutoff: number
}) {
  let icon = mdiCircleSmall
  let content = null
  const slicedPath = props.hoveredBlob?.path ?? ""
  switch (props.metric) {
    case "MOST_COMMITS": {
      icon = mdiSourceCommit
      const noCommits = props.databaseInfo.commitCounts[slicedPath]
      if (!noCommits) {
        content = "No activity in selected range"
        break
      }
      content = `${numToFriendlyString(noCommits)} commit${noCommits > 1 ? "s" : ""}`
      break
    }
    case "LAST_CHANGED": {
      icon = mdiPulse
      const epoch = props.databaseInfo.lastChanged[slicedPath]
      if (!epoch) {
        content = "No activity in selected range"
        break
      }
      content = dateFormatRelative(epoch)
      break
    }
    case "TOP_CONTRIBUTOR": {
      icon = mdiAccount
      const dominant = props.databaseInfo.dominantAuthors[slicedPath]
      const contribSum = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!dominant) {
        content = "No activity in selected range"
        break
      }
      if (!contribSum) {
        content = `${icon}${dominant.author}`
        break
      }
      const authorPercentage = Math.round((dominant.contribcount / contribSum) * 100)
      if (authorPercentage < props.dominantAuthorCutoff) {
        // TODO show how many authors if no dominant author
        icon = mdiAccountGroup
        content = "Multiple contributors"
        break
      }
      content = `${dominant.author} ${authorPercentage}%`
      break
    }
    case "MOST_CONTRIBUTIONS": {
      icon = mdiPlusMinusVariant
      const contribs = props.databaseInfo.contribSumPerFile[slicedPath]
      if (!contribs) {
        content = "No activity in selected range"
        break
      }
      content = `${numToFriendlyString(contribs)} lines`
      break
    }
    case "FILE_TYPE": {
      icon = mdiFileOutline
      const extension = props.hoveredBlob?.name.substring(props.hoveredBlob.name.lastIndexOf(".")) ?? ""
      content = extension
      break
    }
  }
  return (
    <>
      <Icon path={icon} color="currentColor" />
      {content}
    </>
  )
}

function SizeMetricDependentInfo({
  sizeMetric,
  hoveredBlob,
  databaseInfo
}: {
  sizeMetric: SizeMetricType
  hoveredBlob: GitBlobObject | null
  databaseInfo: DatabaseInfo
}) {
  let icon = mdiCircleSmall
  let content = null
  if (!hoveredBlob) {
    return null
  }
  icon = mdiCircleSmall
  switch (sizeMetric) {
    case "FILE_SIZE": {
      icon = mdiResize
      const fileSizeInBytes = hoveredBlob.sizeInBytes
      if (fileSizeInBytes === undefined || fileSizeInBytes === null) {
        content = "Size unknown"
      } else if (fileSizeInBytes < 1024) {
        content = `${fileSizeInBytes} B`
      } else if (fileSizeInBytes < 1024 * 1024) {
        content = `${(fileSizeInBytes / 1024).toFixed(1)} KB`
      } else {
        content = `${(fileSizeInBytes / (1024 * 1024)).toFixed(1)} MB`
      }
      break
    }
    case "MOST_COMMITS": {
      icon = mdiSourceCommit
      const noCommits = databaseInfo.commitCounts[hoveredBlob.path]
      if (!noCommits) {
        content = "No activity in selected range"
        break
      }
      content = `${numToFriendlyString(noCommits)} commit${noCommits > 1 ? "s" : ""}`
      break
    }
    case "LAST_CHANGED": {
      icon = mdiPulse
      const epoch = databaseInfo.lastChanged[hoveredBlob.path]
      if (!epoch) {
        content = "No activity in selected range"
        break
      }
      content = dateFormatRelative(epoch)
      break
    }
    case "MOST_CONTRIBUTIONS": {
      icon = mdiPlusMinusVariant
      const contribs = databaseInfo.contribSumPerFile[hoveredBlob.path]
      if (!contribs) {
        content = "No activity in selected range"
        break
      }
      content = `${numToFriendlyString(contribs)} lines`
      break
    }
  }
  return (
    <>
      <Icon path={icon} color="currentColor" />
      {content}
    </>
  )
}
