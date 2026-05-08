import { useRef, useDeferredValue } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize } from "~/hooks"
import { treemapBlobBorderRadius } from "~/const"
import { cn } from "~/styling"
import { dateFormatShort, expandIntervalToRange } from "~/shared/util"
import { useSelectedCategories } from "~/state/stores/selection"
import { useClickedObject, useObjectColor } from "~/state/stores/clicked-object"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/viewParams"

// const barMargin = treemapPaddingInner
const barMargin = 0

const BarChart = ({ scale, className }: { scale: "linear" | "log"; className?: string }) => {
  const [, setQs] = useQueryStates(viewSearchParamsConfig)
  const selected = useSelectedCategories()
  const clickedObject = useClickedObject()
  const clickedObjectColor = useObjectColor(clickedObject)
  const clickecProps = clickedObjectColor ? { fill: clickedObjectColor } : { className: "bg-blue-primary" }
  const svgRef = useRef<SVGSVGElement>(null)
  const { repo, databaseInfo } = useData()
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = databaseInfo.commitCountPerTimeInterval.map((e) => ({
    ...e,
    countLogged: scale === "log" ? Math.log10(e.count + 1) : e.count
  }))
  const [start, end] = databaseInfo.selectedRange
  const width = size.width
  const height = 70
  const tickHeight = 10
  const textHeight = 20
  const textWidth = 40

  const commitCountPerTimeIntervalForClickedObject = databaseInfo.commitCountPerTimeIntervalForClickedObject
  const clickedObjectIsRepo = clickedObject.hash === repo.currentHead
  const unit = databaseInfo.commitCountPerTimeIntervalUnit

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.timestamp.toString()))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.countLogged) || 0])
    .range([height, 0])

  const barWidth = Math.max(1, xScale.bandwidth() - barMargin * 2)
  const textInterval = Math.max(1, Math.ceil(textWidth / xScale.step()))

  function updateTimeseries(e: readonly number[]) {
    setQs((prev) => ({ ...prev, start: e[0], end: e[1] }))
  }

  return (
    <div ref={ref} className={cn("flex flex-col justify-center", className)}>
      <svg ref={svgRef} width="100%" height={height + tickHeight + textHeight} className="fill-transparent">
        {data.map((d, i) => {
          const shouldDrawLabel = i % textInterval === 0
          const barX = (xScale(d.timestamp.toString()) ?? 0) + barMargin
          const barHeight = height - yScale(d.countLogged)
          const barY = yScale(d.countLogged)
          const [intervalStart, intervalEnd] = expandIntervalToRange(d.timestamp, unit)
          const isInRange = intervalEnd > start && intervalStart < end

          const clickedObjInterval = !clickedObjectIsRepo
            ? commitCountPerTimeIntervalForClickedObject.find(
                (t) => t.timestamp >= intervalStart && t.timestamp < intervalEnd
              )
            : undefined

          const hasFileActivity = clickedObjInterval ? clickedObjInterval.count > 0 : false
          const clickedCountLogged = clickedObjInterval
            ? scale === "log"
              ? Math.log10(clickedObjInterval.count + 1)
              : clickedObjInterval.count
            : 0
          const clickedBarHeight = height - yScale(clickedCountLogged)
          const clickedBarY = yScale(clickedCountLogged)
          const toTime =
            unit !== "day"
              ? ` - ${dateFormatShort(intervalEnd * 1000 - 1000, { weekday: "short" })}`
              : // ? ` - ${dateFormatShort(d.timestamp * 1000 + TimeUnitDurationsMs[unit], { weekday: "short" })}`
                ""
          const title = `${dateFormatShort(intervalStart * 1000, { weekday: "short" })}${toTime}\n${d.count.toLocaleString()} commit${d.count !== 1 ? "s" : ""}
                  ${
                    clickedObjInterval
                      ? `\n${clickedObjInterval.count.toLocaleString()} commit${clickedObjInterval.count !== 1 ? "s" : ""} on ${clickedObject.name}`
                      : ""
                  }`

          return (
            <g key={i}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className={cn(
                  "fill-gray-500/30 opacity-100 transition-[height,width,x,y,fill,opacity] duration-300 ease-out",
                  {
                    "opacity-0": barX === 0,
                    "opacity-20": !isInRange
                  }
                )}
              />
              {hasFileActivity ? (
                <rect
                  x={barX}
                  y={clickedBarY}
                  width={barWidth}
                  height={clickedBarHeight}
                  rx={treemapBlobBorderRadius}
                  ry={treemapBlobBorderRadius}
                  className={cn(
                    "opacity-100 transition-[height,width,x,y,fill,opacity] duration-300 ease-out",
                    isInRange ? "fill-blue-primary" : "fill-blue-primary/50",
                    {
                      "opacity-0": barX === 0
                    },
                    clickecProps.className
                  )}
                  style={clickecProps.fill ? { fill: clickecProps.fill } : {}}
                />
              ) : null}
              {/* Outline */}
              <rect
                x={barX}
                y={0}
                width={barWidth}
                height={height}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className="hover:stroke-blue-primary stroke-transparent stroke-1 hover:fill-transparent"
                onClick={() => {
                  updateTimeseries([intervalStart, intervalEnd])
                }}
              />
              <path
                d={`M${barX + barWidth / 2},${height + 1} L${barX + barWidth / 2},${height + tickHeight - 2}`}
                className={isInRange ? "stroke-blue-secondary" : "stroke-gray-500/30"}
                strokeWidth={1}
              />
              {shouldDrawLabel ? (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  x={barX + barWidth / 2}
                  y={height + tickHeight + textHeight / 2}
                  className="fill-tertiary-text dark:fill-tertiary-text-dark text-xs transition-[x]"
                >
                  {d.date}
                </text>
              ) : null}
              <title>{title}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default BarChart
