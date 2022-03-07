import "./Chart.css"
import { useEffect, useState } from "react"
import {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitObject,
  HydratedGitTreeObject,
} from "../../../parser/src/model"
import {
  hierarchy,
  HierarchyCircularNode,
  HierarchyRectangularNode,
  HierarchyNode,
  pack,
  treemap,
} from "d3"

import {
  treemapPadding,
  textSpacingFromCircle,
  bubblePadding,
  textSpacingFromRect,
  searchMatchColor,
} from "../const"
import { diagonal, unionAuthors } from "../util"
import { Legend } from "./Legend"
import { ChartType, useOptions } from "../OptionsContext"
import styled from "styled-components"
import { Tooltip } from "./Tooltip"
import { useSearch } from "../SearchContext"
import { useData } from "./DataContext"
import { animated, useSpring } from "@react-spring/web"
import { useMetricCaches } from "../MetricContext"

type CircleOrRectHiearchyNode =
  | HierarchyCircularNode<HydratedGitObject>
  | HierarchyRectangularNode<HydratedGitObject>

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
  const [nodes, setNodes] = useState<CircleOrRectHiearchyNode>()
  const [hoveredBlob, setHoveredBlob] = useState<HydratedGitBlobObject | null>(
    null
  )
  const data = useData()
  const { chartType, setClickedBlob } = useOptions()

  useEffect(() => {
    setNodes(
      createPartitionedHiearchy(
        data.commit,
        getPaddedSizeProps(props.size, chartType),
        chartType
      )
    )
  }, [chartType, data.commit, props.size])

  const createGroupHandlers = (d: CircleOrRectHiearchyNode) =>
    isBlob(d.data)
      ? {
          onClick: () => setClickedBlob(d.data as HydratedGitBlobObject),
          onMouseOver: () => setHoveredBlob(d.data as HydratedGitBlobObject),
          onMouseOut: () => setHoveredBlob(null),
        }
      : {
          onClick: () => setClickedBlob(null),
          onMouseOver: () => setHoveredBlob(null),
          onMouseOut: () => setHoveredBlob(null),
        }

  return (
    <>
      <SVG
        chartType={chartType}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${props.size.width} ${props.size.height}`}
      >
        {nodes?.descendants().map((d, i) => {
          return (
            <g key={`${chartType}${d.data.path}`} {...createGroupHandlers(d)}>
              <Node isRoot={i === 0} d={d} />
            </g>
          )
        })}
      </SVG>
      <Legend />
      <Tooltip hoveredBlob={hoveredBlob} />
    </>
  )
}

function Node({ d, isRoot }: { d: CircleOrRectHiearchyNode; isRoot: boolean }) {
  const { chartType } = useOptions()
  const showLabel = !isRoot && isTree(d.data)
  const { searchText } = useSearch()
  const match = !isRoot && isSearchMatch(d, searchText)

  switch (chartType) {
    case "BUBBLE_CHART":
      const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
      return (
        <>
          {showLabel ? (
            <CircleText d={circleDatum} isSearchMatch={match} />
          ) : null}
          <Circle d={circleDatum} isSearchMatch={match} />
        </>
      )
    case "TREE_MAP":
      const rectDatum = d as HierarchyRectangularNode<HydratedGitObject>
      return (
        <>
          {showLabel ? <RectText d={rectDatum} isSearchMatch={match} /> : null}
          <Rect d={rectDatum} isSearchMatch={match} />
        </>
      )
    default:
      throw Error("Unknown chart type")
  }
}

function Circle({
  d,
  isSearchMatch,
}: {
  d: HierarchyCircularNode<HydratedGitObject>
  isSearchMatch: boolean
}) {
  const metricCaches = useMetricCaches()
  const { metricType } = useOptions()

  const props = useSpring({
    cx: d.x,
    cy: d.y,
    r: Math.max(d.r - 1, 0),
    stroke: isSearchMatch ? searchMatchColor : "transparent",
    strokeWidth: isSearchMatch ? "4px" : "1px",
    fill: metricCaches.get(metricType)?.colormap.get(d.data.path) ?? "grey",
  })

  return <animated.circle {...props} className={d.data.type} />
}

function Rect({
  d,
  isSearchMatch,
}: {
  d: HierarchyRectangularNode<HydratedGitObject>
  isSearchMatch: boolean
}) {
  const metricCaches = useMetricCaches()
  const { metricType } = useOptions()

  const props = useSpring({
    x: d.x0,
    y: d.y0,
    width: d.x1 - d.x0,
    height: d.y1 - d.y0,

    stroke: isSearchMatch ? searchMatchColor : "transparent",
    strokeWidth: isSearchMatch ? "2px" : "1px",
    strokeDasharray:
      isSearchMatch && isBlob(d.data) && diagonal(d) > 10 ? "2px" : "0",

    fill:
      d.data.type === "blob"
        ? metricCaches.get(metricType)?.colormap.get(d.data.path) ?? "grey"
        : "transparent",
  })

  return <animated.rect {...props} className={d.data.type} />
}

function CircleText({
  d,
  isSearchMatch,
}: {
  d: HierarchyCircularNode<HydratedGitObject>
  isSearchMatch: boolean
}) {
  const pathProps = useSpring({
    d: circlePathFromCircle(d.x, d.y, d.r + textSpacingFromCircle),
  })

  const textProps = {
    fill: isSearchMatch ? searchMatchColor : "#333",
  }

  return (
    <>
      <animated.path id={d.data.path} className="name-path" {...pathProps} />
      <animated.text>
        <textPath
          {...textProps}
          className="object-name"
          startOffset="50%"
          dominantBaseline="bottom"
          textAnchor="middle"
          xlinkHref={`#${d.data.path}`}
        >
          {d.data.name}
        </textPath>
      </animated.text>
    </>
  )
}

function RectText({
  d,
  isSearchMatch,
}: {
  d: HierarchyRectangularNode<HydratedGitObject>
  isSearchMatch: boolean
}) {
  const props = useSpring({
    x: d.x0 + textSpacingFromRect,
    y: d.y0 - textSpacingFromRect,
    fill: isSearchMatch ? searchMatchColor : "#333",
  })

  return (
    <animated.text {...props} className="object-name">
      {d.data.name}
    </animated.text>
  )
}

function createPartitionedHiearchy(
  data: HydratedGitCommitObject,
  paddedSizeProps: { height: number; width: number },
  chartType: ChartType
) {
  const castedTree = data.tree as HydratedGitObject
  const hiearchy = hierarchy(castedTree)
    .sum((d) => {
      const lineCount = (d as HydratedGitBlobObject).noLines
      return lineCount ? lineCount : 1
    })
    .sort((a, b) =>
      b.value !== undefined && a.value !== undefined ? b.value - a.value : 0
    )

  switch (chartType) {
    case "TREE_MAP":
      const treeMapPartition = treemap<HydratedGitObject>()
        .size([paddedSizeProps.width, paddedSizeProps.height])
        .paddingInner(1)
        .paddingOuter(treemapPadding)

      return treeMapPartition(hiearchy)

    case "BUBBLE_CHART":
      const bubbleChartPartition = pack<HydratedGitObject>()
        .size([paddedSizeProps.width, paddedSizeProps.height])
        .padding(bubblePadding)

      return bubbleChartPartition(hiearchy)
    default:
      throw Error("Invalid chart type")
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

const isTree = (d: HydratedGitObject): d is HydratedGitTreeObject =>
  d.type === "tree"
const isBlob = (d: HydratedGitObject): d is HydratedGitBlobObject =>
  d.type === "blob"
const isSearchMatch = (
  d: HierarchyNode<HydratedGitObject>,
  searchText: string
) =>
  searchText !== "" &&
  d.data.name.toLowerCase().includes(searchText.toLowerCase())
