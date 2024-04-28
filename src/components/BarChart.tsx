import { useRef, useEffect, useDeferredValue } from "react"
import * as d3 from "d3"
import { useData } from "~/contexts/DataContext"
import { useComponentSize } from "~/hooks"

const BarChart = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { repodata2 } = useData()
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const data = repodata2.commitCountPerDay

  useEffect(() => {
    if (!data || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    const width = size.width - 150
    const height = 30

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.date.toString()))
      .range([0, width])
      .padding(0.1)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) || 0])
      .range([height, 0])

    svg.selectAll("rect").remove() // Clear existing bars before redrawing

    svg
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.date) || 0)
      .attr("y", (d) => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.count))
      .attr("fill", "steelblue")
      .append("title") // Append a title element for each bar
      .text((d) => `${d.date}: ${d.count} commits`)
  }, [data, size])

  return (
    <div className="flex justify-center" ref={ref}>
      <svg ref={svgRef} width="calc(100% - 150px)" height={30}></svg>
    </div>
  )
}

export default BarChart
