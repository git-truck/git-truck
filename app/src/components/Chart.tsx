import "./Chart.css"
import { useEffect, useRef, useState } from "react"
import {
  GitObject,
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitObject,
} from "../../../parser/src/model"
import { hierarchy, HierarchyNode, pack, select, Selection, treemap } from "d3"
import { MetricCache, MetricType } from "../metrics"
import {
  treemapPadding,
  textSpacingFromCircle,
  bubblePadding,
  textSpacingFromRect,
} from "../const"
import { unionAuthors } from "../util"
import { Legend } from "./Legend"
import { ChartType, useStore } from "../StoreContext"
import styled from "styled-components"
import { Tooltip } from "./Tooltip"
import { useSearch } from "../SearchContext"

const SVG = styled.svg<{ chartType: ChartType }>`
  display: grid;
  place-items: center;
  padding: ${(props) => getPaddingFromChartType(props.chartType)}px;
  width: 100%;
  height: 100%;
`

interface ChartProps {
  size: { width: number; height: number }
}

export function Chart(props: ChartProps) {
  const [hoveredBlob, setHoveredBlob] = useState<HydratedGitBlobObject | null>(
    null
  )
  const { data, metricCaches, metricType, chartType, setClickedBlob } =
    useStore()
  const { searchText } = useSearch()
  const legendSetRef = useRef<Set<string>>(new Set())
  const svgRef = useRef<SVGSVGElement>(null)

  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const overHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const outHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)

  useEffect(() => {
    overHandlerRef.current = function (e) {
      try {
        // @ts-ignore
        const dataProp = e.target["__data__"]
        let data = dataProp?.data as HydratedGitObject
        if (hoveredBlob?.path !== data.path) {
          if (data && data.type === "blob") {
            e.stopPropagation()
            setHoveredBlob(data)
          }
        }
      } catch (e) {}
    }
  }, [hoveredBlob?.path, setHoveredBlob])

  useEffect(() => {
    outHandlerRef.current = () => {
      setHoveredBlob(null)
    }
  }, [hoveredBlob, setHoveredBlob])

  useEffect(() => {
    clickHandlerRef.current = function (e) {
      try {
        // @ts-ignore
        const dataProp = e.target["__data__"]
        let data = dataProp?.data as HydratedGitObject
        if (data && data.type === "blob") {
          setClickedBlob(data)
          e.stopPropagation()
        } else setClickedBlob(null)
      } catch (e) {}
    }
  }, [setClickedBlob, setHoveredBlob])

  useEffect(() => {
    if (svgRef.current === null) return () => {}
    let svg = select(svgRef.current)
    // const root = svg.append("g")
    legendSetRef.current.clear()

    drawChart(
      data.commit,
      getPaddedSizeProps(props.size, chartType),
      svg,
      metricType,
      chartType,
      metricCaches,
      searchText
    )

    let node = svg.node()

    if (node && clickHandlerRef.current)
      node.addEventListener("click", clickHandlerRef.current)
    if (node && overHandlerRef.current)
      node.addEventListener("mouseover", overHandlerRef.current)
    if (node && outHandlerRef.current)
      node.addEventListener("mouseout", outHandlerRef.current)

    return () => {
      if (node && clickHandlerRef.current)
        node.removeEventListener("click", clickHandlerRef.current)
      if (node && overHandlerRef.current)
        node.removeEventListener("mouseover", overHandlerRef.current)
      if (node && outHandlerRef.current)
        node.removeEventListener("mouseout", outHandlerRef.current)
      svg.selectAll("*").remove()
    }
  }, [chartType, metricType, data.commit, props.size, metricCaches, searchText])

  return (
    <>
      <SVG
        ref={svgRef}
        chartType={chartType}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${props.size.width} ${props.size.height}`}
      />
      <Legend />
      <Tooltip hoveredBlob={hoveredBlob} />
    </>
  )
}

function drawChart(
  data: HydratedGitCommitObject,
  paddedSizeProps: { height: number; width: number },
  root: Selection<SVGSVGElement, unknown, null, undefined>,
  metric: MetricType,
  chartType: ChartType,
  metricCaches: Map<MetricType, MetricCache>,
  searchText: string
) {
  let castedTree = data.tree as GitObject
  let hiearchy = hierarchy(castedTree)
    .sum((d) => (d as HydratedGitBlobObject).noLines)
    .sort((a, b) =>
      b.value !== undefined && a.value !== undefined ? b.value - a.value : 0
    )

  const isSearchMatch = (d: HierarchyNode<GitObject>) =>
    searchText !== "" &&
    d.data.name.toLowerCase().includes(searchText.toLowerCase())

  if (chartType === "TREE_MAP") {
    let partition = treemap<GitObject>()
      .size([paddedSizeProps.width, paddedSizeProps.height])
      .paddingInner(1)
      .paddingOuter(treemapPadding)

    let partitionedHiearchy = partition(hiearchy)

    const group = root
      .selectAll("circle.node")
      .data(partitionedHiearchy)
      .enter()
      .append("g")
      .classed("entry", true)

    const rect = group.append("rect")

    rect
      .classed("file", (d) => d.data.type === "blob")
      .classed("folder", (d) => d.data.type === "tree")
      .classed("search-match", isSearchMatch)
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .style("fill", (d) => {
        return d.data.type === "blob"
          ? metricCaches.get(metric)?.colormap.get(d.data.path) ?? "grey"
          : "none"
      })
      .enter()

    const path = group.append("path")

    if (
      new URL(window.location.toString()).searchParams.get("debug") === "true"
    ) {
      path.classed("name-path debug", true)
    }

    const text = group.append("text")

    text
      .filter(noLinesThreshold)
      .classed("search-match-title", isSearchMatch)
      .attr("x", (d) => d.x0 + textSpacingFromRect)
      .attr(
        "y",
        (d) =>
          d.y0 +
          (d.data.type === "tree"
            ? -textSpacingFromRect
            : textSpacingFromRect * 3)
      )
      .text((d) => d.data.name)
      .style("font-size", "0.8em")
      .style("font-weight", (d) => (d.data.type === "tree" ? "bold" : "normal"))
  } else if (chartType === "BUBBLE_CHART") {
    let partition = pack<GitObject>()
      .size([paddedSizeProps.width, paddedSizeProps.height])
      .padding(bubblePadding)

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
      .classed("search-match", isSearchMatch)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => Math.max(d.r - 1, 0))
      .style("fill", (d) => {
        return d.data.type === "blob"
          ? metricCaches.get(metric)?.colormap.get(d.data.path) ?? "grey"
          : "none"
      })
      .enter()

    const path = group.append("path")

    path
      .attr("d", (d) =>
        circlePathFromCircle(
          d.x,
          d.y,
          Math.max(d.r - 1, 0) + textSpacingFromCircle
        )
      )
      .classed("name-path", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("id", (d) => d.data.path)

    if (
      new URL(window.location.toString()).searchParams.get("debug") === "true"
    ) {
      path.classed("name-path debug", true)
    }

    const text = group
      .append("text")
      .classed("search-match-title", isSearchMatch)

    text
      .filter(noLinesThreshold)
      .append("textPath")
      .attr("startOffset", "50%")
      .attr("dominant-baseline", "bottom")
      .attr("text-anchor", "middle")
      .attr("xlink:href", (d) => `#${d.data.path}`)
      .text((d) => d.data.name)
      .style("font-size", "0.8em")
      .style("font-weight", (d) =>
        d.data.type === "tree" || isSearchMatch(d) ? "bold" : "normal"
      )
  }
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

function getPaddedSizeProps(
  sizeProps: { height: number; width: number },
  chartType: ChartType
) {
  const padding = getPaddingFromChartType(chartType)
  return {
    height: sizeProps.height - padding * 2,
    width: sizeProps.width - padding * 2,
  }
}

function getPaddingFromChartType(chartType: ChartType) {
  switch (chartType) {
    case "BUBBLE_CHART":
      return bubblePadding
    case "TREE_MAP":
      return treemapPadding
    default:
      throw new Error("Chart type is invalid")
  }
}

function noLinesThreshold(d: { data: GitObject }) {
  return (
    d.data.type === "tree" || (d.data as HydratedGitBlobObject).noLines >= 40
  )
}
