import { useRef, useDeferredValue } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize } from "~/hooks"
import { treemapBlobBorderRadius, treemapPaddingInner } from "~/const"
import { cn } from "~/styling"
import { expandIntervalToRange, getPathFromRepoAndHead } from "~/shared/util"
import { useSearchParams, useSubmit } from "react-router"

const BarChart = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { databaseInfo } = useData()
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = databaseInfo.commitCountPerTimeInterval
  const [start, end] = databaseInfo.selectedRange
  const height = 50

  const width = size.width

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.date.toString()))
    .range([0, width])

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 0])
    .range([height, 0])

  // Create a time scale for the x-axis labels
  // const timeScale = d3
  //   .scaleTime()
  //   .domain([new Date((data[0]?.timestamp || 0) * 1000), new Date((data[data.length - 1]?.timestamp || 0) * 1000)])
  //   .range([0, width])
  //   .nice()

  // Generate nice tick values based on data range
  // const ticks = timeScale.ticks(Math.min(8, Math.floor(width / 80)))

  const [searchParams] = useSearchParams()
  const submit = useSubmit()

  function updateTimeseries(e: readonly number[]) {
    const form = new FormData()
    form.append("timeseries", `${e[0]}-${e[1]}`)
    submit(form, {
      action: getPathFromRepoAndHead({
        path: searchParams.get("path")!,
        branch: databaseInfo.branch
      }),
      method: "post"
    })
  }

  return (
    <div ref={ref} className="flex flex-col justify-center">
      <svg ref={svgRef} width="100%" height={height} className="fill-transparent">
        {data.map((d, i) => {
          const barX = (xScale(d.date) ?? 0) + treemapPaddingInner
          const barWidth = Math.max(1, xScale.bandwidth() - treemapPaddingInner * 2)
          const barHeight = height - yScale(d.count)
          const barY = yScale(d.count)
          const isInRange = d.timestamp >= start && d.timestamp < end

          return (
            <g key={`${d.date}-${i}`}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className={cn(
                  "transition-[height,y] duration-300 ease-out",
                  isInRange ? "fill-blue-primary" : "fill-blue-primary/40"
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
                  const [intervalStart, intervalEnd] = expandIntervalToRange(
                    d.timestamp,
                    databaseInfo.commitCountPerTimeIntervalUnit
                  )
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
