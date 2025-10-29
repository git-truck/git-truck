import { useRef, useDeferredValue, type CSSProperties } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize } from "~/hooks"
import { treemapBlobBorderRadius, treemapPaddingInner } from "~/const"
import { cn } from "~/styling"
import { TicksByCount } from "./sliderUtils"

const BarChart = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { databaseInfo } = useData()
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = databaseInfo.commitCountPerTimeInterval
  const [start, end] = databaseInfo.selectedRange
  const height = 50

  // if (!data || !svgRef.current) return
  // const svg = d3.select(svgRef.current)
  const width = size.width

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.date.toString()))
    .range([0, width])
  // .paddingInner(0.5)
  // .paddingOuter(0.5)

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 0])
    .range([height, 0])

  // useEffect(() => {
  // svg.selectAll("rect").remove() // Clear existing bars before redrawing
  // svg
  //   .selectAll("rect")
  //   .data(data)
  //   .enter()
  //   // Rect for bar
  //   .append("rect")
  //   .attr("x", (d) => xScale(d.date) || 0)
  //   .attr("y", (d) => 0)
  //   // .attr("y", (d) => yScale(d.count))
  //   .attr("rx", treemapTreeBorderRadius)
  //   .attr("ry", treemapTreeBorderRadius)
  //   .attr("className", (d) =>
  //     cn(
  //       "hover:fill-blue-secondary",
  //       d.timestamp * 1000 >= start && d.timestamp * 1000 <= end ? "fill-blue-primary" : "fill-blue-primary/50"
  //     )
  //   )
  //   .attr("width", xScale.bandwidth())
  //   .attr("height", (d) => height)
  //   // .attr("height", (d) => height - yScale(d.count))
  //   .append("title") // Append a title element for each bar
  //   .text((d) => `${d.date}: ${d.count} commit${d.count !== 1 ? "s" : ""}`)
  // }, [data, end, size, start])

  // console.log(start.toLocaleString(), end.toLocaleString())
  return (
    <div className="flex flex-col justify-center" ref={ref}>
      <svg ref={svgRef} width="100%" height={height} className="fill-transparent">
        {data.map((d, i) => {
          // console.log(d.timestamp.toLocaleString())
          return (
            <g key={i}>
              <rect
                x={xScale(d.date) || 0 + treemapPaddingInner}
                // y={yScale(d.count)}
                width={xScale.bandwidth() - treemapPaddingInner * 2}
                // height={height - yScale(d.count)}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className={cn(
                  `½starting:h-(--starting-height) h-(--height) transition-[y,height] delay-1000 ease-out [y:var(--y)] starting:[y:0]`,
                  d.timestamp >= start && d.timestamp <= end
                    ? "fill-blue-secondary"
                    : // : "fill-blue-secondary/50"
                      "fill-red-500/50"
                )}
                // onClick={console.log(start, end)}
                style={
                  {
                    "--starting-height": `${height}px`,
                    "--height": `${height - yScale(d.count)}px`,
                    "--y": `${yScale(d.count)}px`
                  } as CSSProperties
                }
              />
              {/* Hover target has full height and stroke when hovered. */}
              <rect
                x={xScale(d.date) || 0 + treemapPaddingInner}
                y={0}
                width={xScale.bandwidth() - treemapPaddingInner * 2}
                height={height}
                rx={treemapBlobBorderRadius}
                ry={treemapBlobBorderRadius}
                className="hover:stroke-blue-secondary stroke-transparent stroke-1 hover:fill-transparent"
              >
                <title>{`${d.date}: ${d.count} commit${d.count !== 1 ? "s" : ""}`}</title>
              </rect>
              {/* <text
                x={xScale(d.date) || 0 + treemapPaddingInner}
                y={height / 2}
                className="dark:hover:fill-primary-text-dark hover:fill-primary-text"
              >{`${d.date}: ${d.count} commit${d.count !== 1 ? "s" : ""}`}</text> */}
            </g>
          )
        })}
      </svg>
      {/* {data.length < 50 ? ( */}
      <TicksByCount count={data.length} tickToLabel={(_, idx) => data[idx]?.count} align="center" onTop={false} />
      {/* ) : null} */}
    </div>
  )
}

export default BarChart
