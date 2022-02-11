import { useEffect, useRef } from "react"
import "./App.css"
import { data } from "./data"
import { useWindowSize } from "react-use"
import { GitTreeObject } from "./../../parser/src/model"
import { hierarchy, pack, select, Selection } from "d3"

const padding = 30
const textSpacingFromCircle = 5

function App() {
  return <BubbleChart data={data} />
}

function BubbleChart({ data }: { data: GitTreeObject }) {
  let svgRef = useRef<SVGSVGElement>(null)
  let sizeProps = useWindowSize(0, 0)
  let paddedSizeProps = {
    height: sizeProps.height - padding * 2,
    width: sizeProps.width - padding * 2,
  }

  useEffect(() => {
    let svg = select(svgRef.current)
    const root = svg.append("g")

    drawBubbleChart(data, paddedSizeProps, root)

    return () => {
      root.remove()
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

function drawBubbleChart(
  data: GitTreeObject,
  paddedSizeProps: { height: number; width: number },
  root: Selection<SVGGElement, unknown, null, undefined>
) {
  let hiearchy = hierarchy(data)
    // TODO: Derrive size from file/folder size
    .sum(() => 10)
    .sort((a, b) =>
      b.value !== undefined && a.value !== undefined ? b.value - a.value : 0
    )

  let partition = pack<GitTreeObject>()
    .size([paddedSizeProps.width, paddedSizeProps.height])
    .padding(padding)

  let partitionedHiearchy = partition(hiearchy)

  const group = root
    .selectAll("circle.node")
    .data(partitionedHiearchy)
    .enter()
    .append("g")

  const circle = group.append("circle")

  circle
    .classed("node", true)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .style("fill", (d) => (d.data.children ? "none" : "cadetblue"))

  const path = group.append("path")

  path
    .attr("d", (d) =>
      circlePathFromCircle(d.x, d.y, d.r + textSpacingFromCircle)
    )
    .classed("name-path", true)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => d.r)
    .attr("id", (d) => d.data.hash)

  if (
    new URL(window.location.toString()).searchParams.get("debug") === "true"
  ) {
    path.classed("name-path debug", true)
  }

  const text = group.append("text")

  text
    .append("textPath")
    .attr("startOffset", "25%")
    .attr("dominant-baseline", "bottom")
    .attr("text-anchor", "middle")
    .attr("xlink:href", (d) => `#${d.data.hash}`)
    .text((d) => d.data.name)
    .style("font-size", "0.8em")
    .style("font-weight", (d) => (d.data.children ? "bold" : "normal"))
}


// a rx ry angle large-arc-flag sweep-flag dx dy
// rx and ry are the two radii of the ellipse
// angle represents a rotation (in degrees) of the ellipse relative to the x-axis;
// large-arc-flag and sweep-flag allows to chose which arc must be drawn as 4 possible arcs can be drawn out of the other parameters.

/**
 * This function generates a path for a circle with a given radius and center
 * @param x x-coordinate of circle center
 * @param y y-coordinate of circle center
 * @param r radius of circle
 * @returns A string meant to be passed as the d attribute to a path element
 */

function circlePathFromCircle(x: number, y: number, r: number) {
  return `M${x},${y}
          m${-r},0
          a${r},${r} 0 1,1 ${r * 2},0
          a${r},${r} 0 1,1 ${-r * 2},0`
}

export default App
