import { useRef, useDeferredValue } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize, useViewSubmit } from "~/hooks"
import { treemapBlobBorderRadius, treemapPaddingInner } from "~/const"
import { cn } from "~/styling"
import { $inspect, expandIntervalToRange } from "~/shared/util"
import { useSelectedCategories } from "~/state/stores/selection"
import { useClickedObject } from "~/state/stores/clicked-object"

const BarChart = () => {
  const selected = useSelectedCategories()
  const clicked = useClickedObject()
  const svgRef = useRef<SVGSVGElement>(null)
  const { repo, databaseInfo } = useData()
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = databaseInfo.commitCountPerTimeInterval.map((e) => ({ ...e, countLogged: Math.log10(e.count + 1) }))
  const [start, end] = databaseInfo.selectedRange
  const height = 70
  const selectedFileTimestamps = databaseInfo.selectedFileCommitTimestamps
  const hasSelectedFile = selectedFileTimestamps.length > 0

  const width = size.width

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.date.toString()))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.countLogged) || 0])
    .range([height, 0])

  // Create a time scale for the x-axis labels
  const timeScale = d3
    .scaleTime()
    .domain([new Date((data[0]?.timestamp || 0) * 1000), new Date((data[data.length - 1]?.timestamp || 0) * 1000)])
    .range([0, width])
    .nice()

  console.log(timeScale.ticks(10).map((d) => d.toISOString().split("T")[0]))

  // Generate nice tick values based on data range
  // const ticks = timeScale.ticks(Math.min(8, Math.floor(width / 80)))

  const submit = useViewSubmit()

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      method: "post"
    })
  }

  return (
    <div ref={ref} className="flex flex-col justify-center">
      <svg ref={svgRef} width="100%" height={height} className="fill-transparent">
        {data.map((d, i) => {
          const barX = (xScale(d.date) ?? 0) + treemapPaddingInner
          const barWidth = Math.max(1, xScale.bandwidth() - treemapPaddingInner * 2)
          const barHeight = height - yScale(d.countLogged)
          const barY = yScale(d.countLogged)
          const isInRange = d.timestamp >= start && d.timestamp < end
          const [intervalStart, intervalEnd] = expandIntervalToRange(
            d.timestamp,
            databaseInfo.commitCountPerTimeIntervalUnit
          )
          const hasFileActivity =
            clicked.hash !== $inspect(repo.currentHead) &&
            hasSelectedFile &&
            selectedFileTimestamps.some((t) => t >= intervalStart && t < intervalEnd)

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
                  "transition-[height,width,x,y,fill] duration-300 ease-out",
                  isInRange ? "fill-blue-primary" : "fill-blue-primary/20"
                  // hasSelectedFile
                  //   ? hasFileActivity
                  //     ? isInRange
                  //       ? "fill-amber-400"
                  //       : "fill-amber-400/40"
                  //     : isInRange
                  //       ? "fill-blue-primary/30"
                  //       : "fill-blue-primary/15"
                  //   : isInRange
                  //     ? "fill-blue-primary"
                  //     : "fill-blue-primary/40"
                )}
              />
              <rect
                x={barX}
                y={0}
                width={barWidth}
                height={height}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className="hover:stroke-blue-secondary stroke-transparent stroke-1 hover:fill-transparent"
                onClick={() => {
                  updateTimeseries([intervalStart, intervalEnd])
                }}
              >
                <title>{`${d.date}: ${d.count.toLocaleString()} commit${d.count !== 1 ? "s" : ""}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default BarChart
