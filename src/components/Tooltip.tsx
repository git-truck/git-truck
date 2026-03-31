import { mdiChevronRight, mdiCircleSmall, mdiPlusMinusVariant, mdiPulse, mdiSourceCommit } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Fragment, useMemo, useRef } from "react"
import type { GitBlobObject, DatabaseInfo } from "~/shared/model"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { allExceptFirst, dateFormatRelative, formatLargeNumber, isBlob, isTree } from "~/shared/util"

import { useMouse } from "~/hooks"
import { cn } from "~/styling"
import { missingInMapColor } from "~/const"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { FileSizeMetric } from "~/metrics/fileSize"
import { useHoveredObject } from "~/state/stores/hovered-object"
import { Metrics } from "~/metrics/metrics"

export function Tooltip({ className = "" }: { className?: string }) {
  const hoveredObject = useHoveredObject()
  const { x, y } = useMouse()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { chartType, sizeMetric, metricType } = useOptions()
  const [metricsData] = useMetrics()
  const { databaseInfo } = useData()
  const colors = hoveredObject
    ? metricsData.get(metricType)?.categoriesMap?.get(hoveredObject.path)
    : [missingInMapColor]
  const color = Array.isArray(colors) && colors.length === 1 ? colors[0] : missingInMapColor

  const right = useMemo(() => x < window.innerWidth / 2, [x])
  const top = useMemo(() => y < window.innerHeight / 2, [y])
  const xTransform = useMemo(() => (right ? `calc(1rem + ${x}px)` : `calc(-0.5rem + ${x}px - 100%)`), [right, x])
  const yTransform = useMemo(() => (top ? `calc(1rem + ${y}px)` : `calc(-0.5rem + ${y}px - 100%)`), [top, y])
  const visible = hoveredObject !== null

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "secondary border-primary-bg dark:border-primary-bg-dark bg-primary-bg/50 dark:bg-primary-bg-dark/40 absolute top-0 left-0 z-50 flex w-min max-w-sm flex-wrap gap-0.5 border bg-none py-0.5 pr-2 pl-1 text-xs backdrop-blur will-change-transform select-none backface-hidden",
        className,
        {
          hidden: !visible,
          "font-bold": isTree(hoveredObject),
          "rounded-xl": chartType === "BUBBLE_CHART",
          "rounded-xs": chartType === "TREE_MAP" || chartType === "PARTITION"
        },
        isBlob(hoveredObject) && color
          ? // TODO: what to do for gradients?
            // ? isDarkColor(color).luminance >= 0.5
            // false
            // ? "text-primary-text"
            // :
            "text-primary-text-dark"
          : "dark:text-primary-text-dark text-primary-text"
      )}
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
          <div className="flex gap-1">{hoveredObject ? <MetricContent hoveredObject={hoveredObject} /> : null}</div>
          {metricType !== sizeMetric ? (
            <div className="flex gap-1">
              <SizeMetricContent sizeMetric={sizeMetric} databaseInfo={databaseInfo} hoveredObject={hoveredObject} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MetricContent({ hoveredObject }: { hoveredObject: GitBlobObject }) {
  const { databaseInfo } = useData()
  const { metricType, topContributorCutoff } = useOptions()
  const [, contributorColors] = useMetrics()

  const metric = Metrics[metricType]
  const icon = metric.icon
  const content = metric.getTooltipContent(hoveredObject, databaseInfo, {
    topContributorCutoff: topContributorCutoff,
    contributorColors: Object.fromEntries(contributorColors.entries()) as Record<string, `#${string}`>
  })

  return (
    <>
      <Icon path={icon} color="currentColor" />
      {content}
    </>
  )
}

function SizeMetricContent({
  sizeMetric,
  hoveredObject: hoveredBlob,
  databaseInfo
}: {
  sizeMetric: SizeMetricType
  hoveredObject: GitBlobObject | null
  databaseInfo: DatabaseInfo
}) {
  let icon: string = mdiCircleSmall
  let content = null
  if (!hoveredBlob) {
    return null
  }

  switch (sizeMetric) {
    case "FILE_SIZE": {
      icon = FileSizeMetric.icon
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
      content = `${formatLargeNumber(noCommits)} commit${noCommits > 1 ? "s" : ""}`
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
      content = `${formatLargeNumber(contribs)} lines`
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
