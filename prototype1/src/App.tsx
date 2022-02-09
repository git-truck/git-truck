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
function App() {
  let svgRef = useRef<SVGElement>(null)
  let rootRef = useRef<SVGGElement>(null)
  let sizeProps = useWindowSize()

  useMount(() => {
    let svg = d3.select(svgRef.current)

    let root = d3
      .hierarchy(data)
      .sum(() => 10 + Math.random() * 20)
      .sort((a, b) => b.value - a.value)

    let partition = d3
      .pack()
      .size([sizeProps.width, sizeProps.height])
      .padding(padding)

    partition(root)

    rootRef.current = svg.append("g")

    const group = rootRef.current
      .selectAll("circle.node")
      .data(root.descendants())
      .enter()
      .append("g")

    group
      .append("circle")
      // .attr("d", d => circlePathFromCircle(d.x, d.y, d.r))
      .classed("node", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .style("fill", (d) => (d.data.children ? "none" : "cadetblue"))
      .style("opacity", 0.3)
      .style("stroke", "black")
      // .attr("id", (d) => d.data.hash)

    group
      .append("path")
      .attr("d", d => circlePathFromCircle(d.x, d.y, d.r + padding / 2))
      .classed("node", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .style("fill", "transparent")
      .style("opacity", 0.3)
      // .style("stroke", "black")
      .attr("id", (d) => d.data.hash)

    group
      .append("text")
      // .attr("dx", (d) => "5%")
      // .attr("direction", "rtl")
      // .attr("y", (d) => d.y)
      // .attr("r", (d) => d.r)
      .attr("dominant-baseline", "middle")
      .attr("text-achor", "middle")
      .append("textPath")
      // .attr("textLength", (d) => d.r * (3/4) * Math.PI)
      .attr("xlink:href", (d) => `#${d.data.hash}`)
      .text((d) => d.data.name)

    return () => {
      rootRef.current.remove()
    }
  })

  return (
    <svg
      {...sizeProps}
      ref={svgRef}
      style={{
        transform: "rotate(-55deg)"
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${sizeProps.width} ${sizeProps.height}`}
    ></svg>
  )
}

function circlePathFromCircle(x, y, r) {
  return `M${x},${y}m${-r},0a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${
    -r * 2
  },0`
}

function inverseCirclePathFromCricle(x, y, r) {
  return `M${x},${y}m${r},0a${r},${r} 0 1,0 ${-r * 2},0a${r},${r} 0 1,0 ${
    r * 2
  },0`
}

export default App
