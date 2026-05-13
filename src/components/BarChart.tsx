import { useRef, useDeferredValue } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize } from "~/hooks"
import { missingInMapColor, treemapBlobBorderRadius, treemapPaddingInner } from "~/const"
import { cn } from "~/styling"
import { dateFormatShort, expandIntervalToRange } from "~/shared/util"
import { useSelectedCategories } from "~/state/stores/selection"
import { useClickedObject, useObjectColor, useObjectColors } from "~/state/stores/clicked-object"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { useOptions } from "~/contexts/OptionsContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useGradient } from "~/hooks/svg"
import { isContributorMetric } from "~/metrics/metrics"

const barMargin = treemapPaddingInner

type StackedBarSlice = {
  author: string
  y: number
  height: number
  fill: string
}

type BarNode = {
  id: string
  x: number
  y: number
  width: number
  height: number
  clickedY: number
  clickedHeight: number
  date: string
  title: string
  shouldDrawLabel: boolean
  isInRange: boolean
  hasFileActivity: boolean
  clickedObjectIsRepo: boolean
  clickedClassName?: string
  clickedFill?: string
  stackedSlices: StackedBarSlice[]
  gradientColors: string[]
  interval: readonly [number, number]
}

const BAR_HEIGHT = 70
const TICK_HEIGHT = 10
const TEXT_HEIGHT = 20
const TEXT_WIDTH = 40

export function BarChart({ scale, className }: { scale: "linear" | "log"; className?: string }) {
  const { databaseInfo } = useData()
  const [{ start, end }, setQs] = useQueryStates({
    start: viewSearchParamsConfig.start.withDefault(databaseInfo.selectedRange[0]),
    end: viewSearchParamsConfig.end.withDefault(databaseInfo.selectedRange[1])
  })

  const { metricType } = useOptions()
  const selectedCategories = useSelectedCategories()
  const selectedAuthors = new Set(selectedCategories.map((c) => c.slice(metricType.length + 1)))
  const [, contributorColors] = useMetrics()
  const clickedObject = useClickedObject()
  const clickedObjectColor = useObjectColor(clickedObject)
  const clickedProps = clickedObjectColor ? { fill: clickedObjectColor } : { className: "bg-blue-primary" }
  const svgRef = useRef<SVGSVGElement>(null)
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = databaseInfo.commitCountPerTimeInterval.map((e) => ({
    ...e,
    countLogged: scale === "log" ? Math.log10(e.count + 1) : e.count
  }))

  const width = size.width

  const commitCountPerTimeIntervalForClickedObject = databaseInfo.commitCountPerTimeIntervalForClickedObject
  const clickedObjectIsRepo = clickedObject.path === databaseInfo.fileTree.path
  const unit = databaseInfo.commitCountPerTimeIntervalUnit

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.timestamp.toString()))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.countLogged) || 0])
    .range([BAR_HEIGHT, 0])

  const barWidth = Math.max(1, xScale.bandwidth() - barMargin * 2)
  const textInterval = Math.max(1, Math.ceil(TEXT_WIDTH / xScale.step()))

  function updateTimeseries(e: readonly number[]) {
    setQs((prev) => ({ ...prev, start: e[0], end: e[1] }))
  }

  const nodeIntervals = Object.fromEntries(
    data.map((d) => [d.timestamp.toString(), expandIntervalToRange(d.timestamp, unit)])
  )

  return (
    <div ref={ref} className={cn("flex flex-col justify-center", className)}>
      <svg
        ref={svgRef}
        width="100%"
        height={BAR_HEIGHT + TICK_HEIGHT + TEXT_HEIGHT}
        className="fill-transparent"
        onClick={(evt) => {
          const id = evt.target instanceof SVGRectElement ? evt.target.dataset.id : undefined
          if (!id) return
          const [start, end] = nodeIntervals[id]
          updateTimeseries([start + 1, end - 1])
        }}
      >
        {data.map((d, i) => {
          const shouldDrawLabel = i % textInterval === 0
          const barX = (xScale(d.timestamp.toString()) ?? 0) + barMargin
          const barHeight = BAR_HEIGHT - yScale(d.countLogged)
          const barY = yScale(d.countLogged)
          const [intervalStart, intervalEnd] = nodeIntervals[d.timestamp.toString()]
          const isInRange = intervalEnd > start && intervalStart < end

          const clickedObjInterval = !clickedObjectIsRepo
            ? commitCountPerTimeIntervalForClickedObject.find(
                (t) => t.timestamp >= intervalStart && t.timestamp < intervalEnd
              )
            : undefined

          const relevantData = clickedObjectIsRepo ? d : clickedObjInterval
          const authorsToStack =
            relevantData && selectedCategories.length > 0
              ? Object.entries(relevantData?.contributors ?? {})
                  .filter(([author]) => selectedAuthors.has(author))
                  .sort((a, b) => b[1] - a[1]) // highest commits first
              : []
          const selectedContributorCount = authorsToStack.reduce((total, [, authorCount]) => total + authorCount, 0)
          const displayedCount = selectedCategories.length > 0 ? selectedContributorCount : (relevantData?.count ?? 0)
          const hasFileActivity = displayedCount > 0

          const clickedCountLogged = scale === "log" ? Math.log10(displayedCount + 1) : displayedCount
          const clickedBarHeight = BAR_HEIGHT - yScale(clickedCountLogged)
          const clickedBarY = yScale(clickedCountLogged)
          const toTime = unit !== "day" ? ` - ${dateFormatShort(intervalEnd * 1000 - 1000, { weekday: "short" })}` : ""
          const title = `${dateFormatShort(intervalStart * 1000, { weekday: "short" })}${toTime}\n${d.count.toLocaleString()} commit${d.count !== 1 ? "s" : ""}
                  ${
                    clickedObjInterval
                      ? `\n${clickedObjInterval.count.toLocaleString()} commit${clickedObjInterval.count !== 1 ? "s" : ""} on ${clickedObject.name}`
                      : ""
                  }`

          let currentY = clickedBarY + clickedBarHeight
          const stackedSlices = authorsToStack.map(([author, authorCount]) => {
            const fraction = authorCount / displayedCount
            const sliceHeight = clickedBarHeight * fraction
            const sliceY = currentY - sliceHeight
            currentY = sliceY
            return {
              author,
              y: sliceY,
              height: sliceHeight,
              fill: contributorColors.get(author) ?? missingInMapColor
            }
          })

          const gradientColors =
            relevantData && selectedCategories.length === 0
              ? Object.entries(relevantData.contributors ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([author]) => contributorColors.get(author) ?? missingInMapColor)
              : []

          const node: BarNode = {
            id: d.timestamp.toString(),
            x: barX,
            y: barY,
            width: barWidth,
            height: barHeight,
            clickedY: clickedBarY,
            clickedHeight: clickedBarHeight,
            date: d.date,
            title,
            shouldDrawLabel,
            isInRange,
            hasFileActivity,
            clickedObjectIsRepo,
            clickedClassName: clickedProps.className,
            clickedFill: clickedProps.fill,
            stackedSlices,
            gradientColors,
            interval: [intervalStart, intervalEnd]
          }

          return <Bar key={node.id} node={node} />
        })}
      </svg>
    </div>
  )
}

function Bar({ node }: { node: BarNode }) {
  const { metricType } = useOptions()
  const metricIsContributorMetric = isContributorMetric(metricType)
  const clickedObject = useClickedObject()
  const colors = useObjectColors(clickedObject)
  const { fill: clickedFill, linearGradient: clickedGradient } = useGradient(colors)
  const { fill, linearGradient } = useGradient(node.gradientColors)

  // Fallback to clickedFill or class if gradient logic doesn't apply
  const hasGradient = node.gradientColors.length > 1
  const clickStyle = metricIsContributorMetric
    ? hasGradient
      ? { fill }
      : node.gradientColors.length === 1
        ? { fill: node.gradientColors[0] }
        : node.clickedFill
          ? { fill: node.clickedFill }
          : {}
    : { fill: clickedFill }
  const clickClass = node.gradientColors.length > 0 ? "" : node.clickedClassName

  const shouldDrawClickedBar = node.hasFileActivity && !node.clickedObjectIsRepo && node.stackedSlices.length === 0

  return (
    <g>
      {hasGradient ? linearGradient : null}
      {!metricIsContributorMetric ? clickedGradient : null}
      {/* Root activity */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={treemapBlobBorderRadius}
        ry={treemapBlobBorderRadius}
        className={cn("fill-gray-500/30 opacity-100 transition-[height,width,x,y,fill,opacity] duration-300 ease-out", {
          "opacity-40": !node.isInRange
        })}
      />
      {/* Selection activity */}
      {shouldDrawClickedBar ? (
        <rect
          x={node.x}
          y={node.clickedY}
          width={node.width}
          height={node.clickedHeight}
          rx={treemapBlobBorderRadius}
          ry={treemapBlobBorderRadius}
          className={cn(
            "opacity-100 transition-[height,width,x,y,fill,opacity] duration-300 ease-out",
            node.isInRange ? "fill-blue-primary" : "fill-blue-primary/50",
            {
              "opacity-0": node.x === 0
            },
            clickClass
          )}
          style={clickStyle}
        />
      ) : null}
      {node.stackedSlices.map((slice, idx) => {
        const isBottom = idx === 0
        const isTop = idx === node.stackedSlices.length - 1

        return (
          <rect
            key={slice.author}
            x={node.x}
            y={slice.y}
            width={node.width}
            height={slice.height}
            rx={isTop || isBottom ? treemapBlobBorderRadius : 0}
            ry={isTop || isBottom ? treemapBlobBorderRadius : 0}
            className={cn("opacity-100 transition-[height,width,x,y,fill,opacity] duration-300 ease-out", {
              "opacity-50": !node.isInRange
            })}
            style={{ fill: slice.fill }}
          />
        )
      })}
      {/* Outline */}
      <rect
        x={node.x}
        y={0}
        width={node.width}
        height={BAR_HEIGHT + TICK_HEIGHT + TEXT_HEIGHT}
        rx={treemapBlobBorderRadius}
        ry={treemapBlobBorderRadius}
        className="hover:stroke-blue-primary fill-transparent stroke-transparent stroke-1"
        data-id={node.id}
      />
      {/* Tick */}
      <path
        d={`M${node.x + node.width / 2},${BAR_HEIGHT + 1} L${node.x + node.width / 2},${BAR_HEIGHT + TICK_HEIGHT - 2}`}
        className={node.isInRange ? "stroke-gray-500" : "stroke-gray-500/30"}
        strokeWidth={1}
      />
      {/* Tick Label */}
      {node.shouldDrawLabel ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          x={node.x + node.width / 2}
          y={BAR_HEIGHT + TICK_HEIGHT + TEXT_HEIGHT / 2}
          className={cn(
            "text-xs transition-[x]",
            node.isInRange
              ? "fill-primary-text dark:fill-primary-text-dark"
              : "fill-tertiary-text dark:fill-tertiary-text-dark"
          )}
        >
          {node.date}
        </text>
      ) : null}
      <title>{node.title}</title>
    </g>
  )
}
