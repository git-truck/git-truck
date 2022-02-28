import "./BubbleChart.css"
import { useCallback, useEffect, useRef } from "react"
import {
  GitObject,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
} from "../../../parser/src/model"
import { hierarchy, pack, select, Selection, treemap } from "d3"
import { MetricType } from "../metrics"
import { padding, textSpacingFromCircle } from "../const"
import { unionAuthors } from "../util"
import { useStore } from "../StoreContext"
import styled from "styled-components"
import { useWindowSize } from "react-use"

export const Chart = {
  TREE_MAP: "Tree map",
  BUBBLE_CHART: "Bubble chart",
}

const SVG = styled.svg`
  width: 100%;
  height: 100%;
`

export type ChartType = keyof typeof Chart

interface BubbleChartProps {}

export function BubbleChart(props: BubbleChartProps) {
  const {
    data,
    metricCaches,
    metricType,
    chartType,
    currentHoveredBlob,
    setHoveredBlob,
    setClickedBlob,
  } = useStore()

  const legendSetRef = useRef<Set<string>>(new Set())

  let svgRef = useRef<SVGSVGElement>(null)
  let sizeProps = useWindowSize(0, 0)

  const paddedSizeProps = getPaddedSizeProps(sizeProps)

  const drawChart = useCallback(
    function (
      data: HydratedGitCommitObject,
      paddedSizeProps: { height: number; width: number },
      root: Selection<SVGGElement, unknown, null, undefined>,
      metric: MetricType,
      chartType: ChartType
    ) {
      let castedTree = data.tree as GitObject
      let hiearchy = hierarchy(castedTree)
        .sum((d) => (d as HydratedGitBlobObject).noLines)
        .sort((a, b) =>
          b.value !== undefined && a.value !== undefined ? b.value - a.value : 0
        )

      if (chartType === "TREE_MAP") {
        let partition = treemap<GitObject>()
          .size([paddedSizeProps.width, paddedSizeProps.height])
          .padding(padding)

        let partitionedHiearchy = partition(hiearchy)

        const group = root
          .selectAll("circle.node")
          .data(partitionedHiearchy)
          .enter()
          .append("g")
          .classed("entry", true)

        const circle = group.append("rect")

        circle
          .classed("file", (d) => d.data.type === "blob")
          .classed("folder", (d) => d.data.type === "tree")
          .attr("x", (d) => d.x0)
          .attr("y", (d) => d.y0)
          .attr("width", (d) => d.x1 - d.x0)
          .attr("height", (d) => d.y1 - d.y0)
          .style("fill", (d) => {
            return d.data.type === "blob"
              ? metricCaches.get(metric)?.colormap.get(d.data.name) ?? "grey"
              : "none"
          })
          .enter()

        const path = group.append("path")

        if (
          new URL(window.location.toString()).searchParams.get("debug") ===
          "true"
        ) {
          path.classed("name-path debug", true)
        }

        const text = group.append("text")

        text
          .attr("x", (d) => d.x0)
          .attr("y", (d) => d.y0 - textSpacingFromCircle)
          .text((d) => d.data.name)
          .style("font-size", "0.8em")
          .style("font-weight", (d) =>
            d.data.type === "tree" ? "bold" : "normal"
          )
      } else if (chartType === "BUBBLE_CHART") {
        let partition = pack<GitObject>()
          .size([paddedSizeProps.width, paddedSizeProps.height])
          .padding(padding)

        let partitionedHiearchy = partition(hiearchy)

        const group = root
          .selectAll("circle.node")
          .data(partitionedHiearchy)
          .enter()
          .append("g")
          .classed("entry", true)

        const circle = group.append("circle")

        circle
          .classed("file", (d) => d.data.type === "blob")
          .classed("folder", (d) => d.data.type === "tree")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", (d) => d.r)
          .style("fill", (d) => {
            return d.data.type === "blob"
              ? metricCaches.get(metric)?.colormap.get(d.data.name) ?? "grey"
              : "none"
          })
          .enter()

        const path = group.append("path")

        path
          .attr("d", (d) =>
            circlePathFromCircle(d.x, d.y, d.r + textSpacingFromCircle)
          )
          .classed("name-path", true)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", (d) => d.r)
          .attr("id", (d) => d.data.path)

        if (
          new URL(window.location.toString()).searchParams.get("debug") ===
          "true"
        ) {
          path.classed("name-path debug", true)
        }

        const text = group.append("text")

        text
          .append("textPath")
          .attr("startOffset", "50%")
          .attr("dominant-baseline", "bottom")
          .attr("text-anchor", "middle")
          .attr("xlink:href", (d) => `#${d.data.path}`)
          .text((d) => d.data.name)
          .style("font-size", "0.8em")
          .style("font-weight", (d) =>
            d.data.type === "tree" ? "bold" : "normal"
          )
      }
    },
    [metricCaches]
  )

  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const moveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const leaveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)

  useEffect(() => {
    moveHandlerRef.current = function (e) {
      // @ts-ignore
      let d3Data = e.target["__data__"]
      let data = d3Data?.data
      if (currentHoveredBlob?.path !== data.path) {
        if (data && data.type === "blob") {
          e.stopPropagation()
          setHoveredBlob(data)
        } else setHoveredBlob(null)
      }
    }
  }, [currentHoveredBlob?.path, setHoveredBlob])

  useEffect(() => {
    leaveHandlerRef.current = function (e) {
      setHoveredBlob(null)
    }
  }, [currentHoveredBlob, setHoveredBlob])

  useEffect(() => {
    clickHandlerRef.current = function (e) {
      //@ts-ignore
      let data = e.target["__data__"].data
      if (data && data.type === "blob") {
        setClickedBlob(data)
        e.stopPropagation()
      }
    }
  }, [setClickedBlob, setHoveredBlob])

  useEffect(() => {
    let svg = select(svgRef.current)
    const root = svg.append("g")
    legendSetRef.current.clear()
    drawChart(
      data.commit,
      getPaddedSizeProps(sizeProps),
      root,
      metricType,
      chartType
    )

    let node = root.node()

    if (node && clickHandlerRef.current)
      node.addEventListener("click", clickHandlerRef.current)
    if (node && moveHandlerRef.current)
      node.addEventListener("pointermove", moveHandlerRef.current)
    if (node && leaveHandlerRef.current)
      node.addEventListener("pointerleave", leaveHandlerRef.current)

    return () => {
      if (node && clickHandlerRef.current)
        node.removeEventListener("click", clickHandlerRef.current)
      if (node && moveHandlerRef.current)
        node.removeEventListener("pointermove", moveHandlerRef.current)
      if (node && leaveHandlerRef.current)
        node.removeEventListener("pointerleave", leaveHandlerRef.current)
      root.remove()
    }
  }, [drawChart, sizeProps, data, metricType, chartType])

  return (
    <>
      <SVG
        ref={svgRef}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${paddedSizeProps.width} ${paddedSizeProps.height}`}
      />
    </>
  )
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
          m0,${r}
          a${r},${r} 0 1,1 0,${-r * 2}
          a${r},${r} 0 1,1 0,${r * 2}`
}

export function makePercentResponsibilityDistribution(
  d: HydratedGitBlobObject
): Record<string, number> {
  const unionedAuthors = unionAuthors(d)
  const sum = Object.values(unionedAuthors).reduce((acc, v) => acc + v, 0)

  const newAuthorsEntries = Object.entries(unionedAuthors).reduce(
    (newAuthorOject, [author, contrib]) => {
      const fraction: number = contrib / sum
      return { ...newAuthorOject, [author]: fraction }
    },
    {}
  )

  return newAuthorsEntries
}

function getPaddedSizeProps(sizeProps: { height: number; width: number }) {
  return {
    height: sizeProps.height - padding * 2,
    width: sizeProps.width - padding * 2,
  }
}
