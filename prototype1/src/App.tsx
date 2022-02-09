import { useEffect, useRef, useState } from "react"
import logo from "./logo.svg"
import "./App.css"
import { data } from "./data"
import * as d3 from "d3"
import { useWindowSize } from "react-use"

let { children } = data
let id = (x: any) => x

function useMount(fn: Function) {
  useEffect(() => fn(), [])
}

function App() {
  const svgRef = useRef(SVGElement)
  const gRef = useRef(SVGGElement)
  const sizeProps = useWindowSize()

  useMount(() => {

  })

  useMount(() => {
    const svg = d3.select(svgRef.current)
    svg
      .append("g")
      .selectAll("circle")
      .data(children)
      .join(
        (enter) =>
          enter
            .append("circle")

            .attr("cx", (d) => 50 + Math.random() * (sizeProps.width - 100))
            .attr("cy", (d) => 50 + Math.random() * (sizeProps.height - 100))
            .attr("r", (d) => Math.random() * 50)
            .style("fill", (d) => (d.children ? "red" : "blue"))
            .style("stroke", "transparent")
            .append("title").text(d => d.name),
        id,
        (exit) => exit.remove()
      )

    return () => {
      svg.select("g").remove()
    }
  })

  return <svg ref={svgRef} {...sizeProps}></svg>
}

export default App
