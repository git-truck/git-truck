import { useEffect, useRef } from "react"
import "./App.css"
import { data } from "./data"
import * as d3 from "d3"
import { useWindowSize } from "react-use"

let { children } = data
let id = (x: any) => x

function useMount(fn: Function) {
  useEffect(() => fn(), [])
}

const padding = 30
const textSpacingFromCircle = 5

function App() {
  let svgRef = useRef<SVGSVGElement>(null)
  let rootRef =
    useRef<d3.Selection<SVGGElement, unknown, null, undefined>>(null)
  let sizeProps = useWindowSize(0, 0)
  let paddedSizeProps = {
    height: sizeProps.height - padding * 2,
    width: sizeProps.width - padding * 2,
  }

  useEffect(() => {
    let svg = d3.select(svgRef.current)

    let root = d3
      .hierarchy(data)
      // TODO: Derrive size from file/folder size
      .sum(() => 10)
      .sort((a, b) => b.value - a.value)

    let partition = d3
      .pack()
      .size([paddedSizeProps.width, paddedSizeProps.height])
      .padding(padding)

    partition(root)

    rootRef.current = svg.append("g")

    const group = rootRef.current
      .selectAll("circle.node")
      .data(root.descendants())
      .enter()
      .append("g")

    const circle = group.append("circle")

    circle
      // .attr("d", d => circlePathFromCircle(d.x, d.y, d.r))
      .classed("node", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .style("fill", (d) => (d.data.children ? "none" : "cadetblue"))
      .style("opacity", 0.3)
      .style("stroke", "black")
    // .attr("id", (d) => d.data.hash)

    const path = group.append("path")

    path
      .attr("d", (d) => circlePathFromCircle(d.x, d.y, d.r + padding / 10))
      .classed("node", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .style("fill", "transparent")
      .style("opacity", 0.3)

      // .style("stroke", "black")
      .attr("id", (d) => d.data.hash)

    if (new URL(window.location.toString()).searchParams.get("debug") === "true") {
      path.style("stroke", "black")
      path.style("stroke-dasharray", "5,5")
    }
    // .attr("marker-end", "url(#arrowhead)")

    const text = group.append("text")

    text
      .append("textPath")
      .attr("startOffset", "25%")
      .attr("dominant-baseline", "bottom")
      .attr("text-anchor", "middle")

      // .attr("textLength", (d) => d.data.name.length * 7)
      .attr("xlink:href", (d) => `#${d.data.hash}`)
      .text((d) => d.data.name)
      .style("font-size", "0.8em")
      .style("font-weight", (d) => (d.data.children ? "bold" : "normal"))

    return () => {
      rootRef.current.remove()
    }
  }, [paddedSizeProps])

  return (
    <div
      style={{
        padding,
      }}
    >
      <svg
        {...paddedSizeProps}
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${paddedSizeProps.width} ${paddedSizeProps.height}`}
      />
    </div>
  )
}
// a rx ry angle large-arc-flag sweep-flag dx dy
// rx and ry are the two radii of the ellipse
// angle represents a rotation (in degrees) of the ellipse relative to the x-axis;
// large-arc-flag and sweep-flag allows to chose which arc must be drawn as 4 possible arcs can be drawn out of the other parameters.

function circlePathFromCircle(x, y, r) {
  return `M${x},${y}
          m${-r},0
          a${r},${r} 0 1,1 ${r * 2},0
          a${r},${r} 0 1,1 ${-r * 2},0`
}

export default App
