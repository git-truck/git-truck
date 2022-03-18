import { memo, useEffect, useMemo, useState } from "react"
import {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitObject,
  HydratedGitTreeObject,
} from "../../../parser/src/model"
import type {
  HierarchyCircularNode,
  HierarchyRectangularNode,
  HierarchyNode,
} from "d3-hierarchy"

import {
  treemapPadding,
  textSpacingFromCircle,
  bubblePadding,
  searchMatchColor,
  estimatedLetterWidth,
} from "../const"
import { ChartType, useOptions } from "../contexts/OptionsContext"
import styled from "styled-components"
import { Tooltip } from "./Tooltip"
import { useSearch } from "../contexts/SearchContext"
import { useData } from "../contexts/DataContext"
import { animated, useSpring } from "@react-spring/web"
import { useMetricCaches } from "../contexts/MetricContext"

import {
  hierarchy,
  pack,
  treemap,
} from "d3-hierarchy"
import { usePath } from "../contexts/FolderContext"
import { ClickableText } from "./util"

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
  const [hoveredBlob, setHoveredBlob] = useState<HydratedGitBlobObject | null>(
    null
  )
  const data = useData()
  const { chartType, setClickedBlob } = useOptions()

  const { path, setPath } = usePath();

  const nodes = useMemo(() => {
    return createPartitionedHiearchy(
      data.commit,
      getPaddedSizeProps(props.size, chartType),
      chartType,
      path
    )
  }, [chartType, data.commit, props.size, path])

  useEffect(() => setHoveredBlob(null), [chartType, data.commit, props.size])

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
              <Node setPath={(a: string) => setPath(a)} isRoot={i === 0} d={d} />
            </g>
          )
        })}
      </SVG>
      <Tooltip hoveredBlob={hoveredBlob} />
    </>
  )
}

const Node = memo(function Node({ d, isRoot, setPath }: { d: CircleOrRectHiearchyNode; isRoot: boolean, setPath: (a: string) => void }) {
  const { chartType } = useOptions()
  let showLabel = isTree(d.data) // && !isRoot
  const { searchText } = useSearch()
  const match = !isRoot && isSearchMatch(d, searchText)

  switch (chartType) {
    case "BUBBLE_CHART":
      const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
      if (circleDatum.r * Math.PI < d.data.name.length * estimatedLetterWidth)
        showLabel = false

      return (
        <>
          <Circle d={circleDatum} isSearchMatch={match} />
          {showLabel ? (
            <CircleText setPath={setPath} d={circleDatum} isSearchMatch={match} />
          ) : null}
        </>
      )
    case "TREE_MAP":
      const rectDatum = d as HierarchyRectangularNode<HydratedGitObject>
      if (
        rectDatum.x1 - rectDatum.x0 <
        d.data.name.length * estimatedLetterWidth
      )
        showLabel = false

      return (
        <>
          <Rect d={rectDatum} isSearchMatch={match} />
          {showLabel ? <RectText setPath={setPath} d={rectDatum} isSearchMatch={match} /> : null}
        </>
      )
    default:
      throw Error("Unknown chart type")
  }
})

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
    strokeWidth: isSearchMatch ? "4px" : "1px",

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
  setPath
}: {
  d: HierarchyCircularNode<HydratedGitObject>
  isSearchMatch: boolean,
  setPath: (a: string) => void
}) {
  return (
    <>
      <path
        id={d.data.path}
        className="name-path"
        d={circlePathFromCircle(d.x, d.y, d.r + textSpacingFromCircle)}
      />
      <text
        style={{
          stroke: "var(--global-bg-color)",
        }}
        strokeWidth="7"
        strokeLinecap="round"
      >
        <textPath
          fill={isSearchMatch ? searchMatchColor : "#333"}
          className="object-name"
          startOffset="50%"
          dominantBaseline="central"
          textAnchor="middle"
          xlinkHref={`#${d.data.path}`}
        >
          {d.data.name}
        </textPath>
      </text>
      <ClickableText>
        <textPath
          onClick={() => setPath(d.data.path)}
          fill={isSearchMatch ? searchMatchColor : "#333"}
          className="object-name"
          startOffset="50%"
          dominantBaseline="central"
          textAnchor="middle"
          xlinkHref={`#${d.data.path}`}
        >
          {d.data.name}
        </textPath>
      </ClickableText>
    </>
  )
}

function RectText({
  d,
  isSearchMatch,
  setPath
}: {
  d: HierarchyRectangularNode<HydratedGitObject>
  isSearchMatch: boolean
  setPath: (a: string) => void
}) {
  const props = useSpring({
    x: d.x0 + 4,
    y: d.y0 + 12,
    fill: isSearchMatch ? searchMatchColor : "#333",
  })

  return (
    <animated.text {...props} onClick={() => setPath(d.data.path)} className="object-name">
      {d.data.name}
    </animated.text>
  )
}

function createPartitionedHiearchy(
  data: HydratedGitCommitObject,
  paddedSizeProps: { height: number; width: number },
  chartType: ChartType,
  path: string
) {
  const root = data.tree as HydratedGitTreeObject

  let currentTree = root
  for(const step of path.split("/")) {
    for(const child of currentTree.children) {
      if (child.type === "tree" && child.name === step) {
        currentTree = child
        break;
      }
    }
  }

  const castedTree = currentTree as HydratedGitObject

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
  const unionedAuthors = d.unionedAuthors
  if (!unionedAuthors) throw Error("unionedAuthors is undefined")
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
