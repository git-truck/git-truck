import { animated } from "@react-spring/web"
import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, treemap } from "d3-hierarchy"
import type { MouseEventHandler } from "react"
import { useDeferredValue } from "react"
import { memo, useEffect, useMemo } from "react"
import type {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitObject,
  HydratedGitTreeObject,
} from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useToggleableSpring } from "~/hooks"
import {
  bubblePadding,
  estimatedLetterHeightForDirText,
  estimatedLetterWidth,
  searchMatchColor,
  circleTreeTextOffsetY,
  treemapBlobTextOffsetX,
  treemapBlobTextOffsetY,
  treemapNodeBorderRadius,
  treemapPaddingTop,
  treemapTreeTextOffsetX,
  circleBlobTextOffsetY,
  treemapTreeTextOffsetY,
} from "../const"
import { useData } from "../contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import type { ChartType } from "../contexts/OptionsContext"
import { useOptions } from "../contexts/OptionsContext"
import { usePath } from "../contexts/PathContext"
import { useComponentSize } from "../hooks"
import { treemapBinary } from "d3-hierarchy"
import { getTextColorFromBackground, isBlob, isTree } from "~/util"
import clsx from "clsx"

type CircleOrRectHiearchyNode = HierarchyCircularNode<HydratedGitObject> | HierarchyRectangularNode<HydratedGitObject>

export const Chart = memo(function Chart({
  setHoveredObject,
}: {
  setHoveredObject: (obj: HydratedGitObject | null) => void
}) {
  const [ref, rawSize] = useComponentSize()
  const size = useDeferredValue(rawSize)
  const { analyzerData } = useData()
  const { chartType } = useOptions()
  const { path } = usePath()
  const { clickedObject, setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const nodes = useMemo(() => {
    if (size.width === 0 || size.height === 0) return []
    return createPartitionedHiearchy(analyzerData.commit, size, chartType, path).descendants()
  }, [analyzerData.commit, size, chartType, path])

  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, analyzerData.commit, size, setHoveredObject])

  const createGroupHandlers: (
    d: CircleOrRectHiearchyNode,
    isRoot: boolean
  ) => Record<"onClick" | "onMouseOver" | "onMouseOut", MouseEventHandler<SVGGElement>> = (d, isRoot) => {
    return isBlob(d.data)
      ? {
          onClick: (evt) => {
            evt.stopPropagation()
            return setClickedObject(d.data)
          },
          onMouseOver: () => setHoveredObject(d.data as HydratedGitObject),
          onMouseOut: () => setHoveredObject(null),
        }
      : {
          onClick: (evt) => {
            evt.stopPropagation()
            setClickedObject(d.data)
            setPath(d.data.path)
          },
          onMouseOver: (evt) => {
            evt.stopPropagation()
            if (!isRoot) setHoveredObject(d.data as HydratedGitObject)
            else setHoveredObject(null)
          },
          onMouseOut: () => setHoveredObject(null),
        }
  }

  return (
    <div className="relative grid place-items-center overflow-hidden" ref={ref}>
      <svg
        className={clsx("grid h-full w-full place-items-center", {
          "cursor-zoom-out": path.includes("/"),
        })}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        onClick={() => {
          // Move up to parent
          const parentPath = path.split("/").slice(0, -1).join("/")
          // Check if parent is root
          if (parentPath === "") setPath("/")
          else setPath(parentPath)
        }}
      >
        {nodes.map((d, i) => {
          return (
            <g
              className={clsx("hover:opacity-60", {
                "cursor-pointer": i === 0,
                "cursor-zoom-in": i > 0 && isTree(d.data),
                "animate-blink": clickedObject?.path === d.data.path,
              })}
              key={`${chartType}${d.data.path}`}
              {...createGroupHandlers(d, i === 0)}
            >
              <Node isRoot={i === 0} d={d} />
            </g>
          )
        })}
      </svg>
    </div>
  )
})

const Node = memo(function Node({ d, isRoot }: { d: CircleOrRectHiearchyNode; isRoot: boolean }) {
  const { chartType, labelsVisible } = useOptions()
  let showLabel = labelsVisible
  const { path } = usePath()
  let displayText = d.data.name
  type textIsTooLongFunction = (text: string) => boolean

  if (isRoot) {
    const pathSteps = path.split("/")
    const dispSteps = displayText.split("/")
    let ps = 0
    let ds = 0
    while (ps < pathSteps.length && ds < dispSteps.length) {
      if (pathSteps[ps] !== dispSteps[ds]) ps++
      else {
        ps++
        ds++
      }
    }

    displayText = dispSteps.slice(ds - 1).join("/")
  }

  switch (chartType) {
    case "BUBBLE_CHART":
      const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
      collapseDisplayText_mut(
        (text: string) => circleDatum.r < 50 || circleDatum.r * Math.PI < text.length * estimatedLetterWidth
      )
      break
    case "TREE_MAP":
      const rectDatum = d as HierarchyRectangularNode<HydratedGitObject>
      const xOffset = isTree(d.data) ? treemapTreeTextOffsetX : treemapBlobTextOffsetX
      const yOffset = isTree(d.data) ? treemapTreeTextOffsetY : treemapBlobTextOffsetY

      collapseDisplayText_mut(
        (_: string) => rectDatum.x1 - rectDatum.x0 - xOffset * 2 < displayText.length * estimatedLetterWidth,
        (_: string) => rectDatum.y1 - rectDatum.y0 - yOffset < estimatedLetterHeightForDirText
      )
      break
    default:
      throw Error("Unknown chart type")
  }

  return (
    <>
      <Path
        className={clsx({
          "cursor-pointer": isBlob(d.data),
        })}
        d={d}
        isSearchMatch={d.data.isSearchResult ?? false}
      />
      {showLabel ? (
        chartType === "BUBBLE_CHART" ? (
          <CircleText
            d={d as HierarchyCircularNode<HydratedGitObject>}
            displayText={displayText}
            isSearchMatch={d.data.isSearchResult ?? false}
          />
        ) : (
          <RectText
            className="font-mono"
            d={d as HierarchyRectangularNode<HydratedGitObject>}
            displayText={displayText}
            isSearchMatch={d.data.isSearchResult ?? false}
          />
        )
      ) : null}
    </>
  )

  function collapseDisplayText_mut(textIsTooLong: textIsTooLongFunction, textIsTooTall?: textIsTooLongFunction) {
    if (textIsTooLong(displayText)) {
      displayText = displayText.replace(/\/.+\//gm, "/.../")
      if (textIsTooLong(displayText)) {
        showLabel = false
      }
    }

    if (textIsTooTall && textIsTooTall(displayText)) {
      displayText = displayText.replace(/\/.+\//gm, "/.../")

      if (textIsTooTall(displayText)) {
        showLabel = false
      }
    }
  }
})

function Path({
  d,
  isSearchMatch,
  className = "",
}: {
  d: CircleOrRectHiearchyNode
  isSearchMatch: boolean
  className?: string
}) {
  const [metricsData] = useMetrics()
  const { chartType, metricType, authorshipType } = useOptions()

  const dProp = useMemo(() => {
    if (chartType === "BUBBLE_CHART") {
      const datum = d as HierarchyCircularNode<HydratedGitObject>
      return circlePathFromCircle(datum.x, datum.y + estimatedLetterHeightForDirText - 1, datum.r - 1)
    } else {
      const datum = d as HierarchyRectangularNode<HydratedGitObject>
      return roundedRectPathFromRect(
        datum.x0,
        datum.y0,
        datum.x1 - datum.x0,
        datum.y1 - datum.y0,
        treemapNodeBorderRadius
      )
    }
  }, [chartType, d])

  const props = useToggleableSpring({
    d: dProp,
    stroke: isSearchMatch ? searchMatchColor : "transparent",
    strokeWidth: "1px",

    fill: isBlob(d.data)
      ? metricsData[authorshipType].get(metricType)?.colormap.get(d.data.path) ?? "grey"
      : "transparent",
  })

  return (
    <animated.path
      {...props}
      className={clsx(className, {
        "animate-stroke-pulse": isSearchMatch,
        "stroke-black/20": isTree(d.data),
      })}
    />
  )
}

function CircleText({
  d,
  displayText,
  isSearchMatch,
  className = "",
}: {
  d: HierarchyCircularNode<HydratedGitObject>
  displayText: string
  isSearchMatch: boolean
  className?: string
}) {
  const [metricsData] = useMetrics()
  const { authorshipType, metricType } = useOptions()
  const yOffset = isTree(d.data) ? circleTreeTextOffsetY : circleBlobTextOffsetY

  const props = useToggleableSpring({
    d: circlePathFromCircle(d.x, d.y + estimatedLetterHeightForDirText - 1, d.r - yOffset),
  })

  const textProps = useToggleableSpring({
    fill: isSearchMatch
      ? searchMatchColor
      : isBlob(d.data)
      ? getTextColorFromBackground(metricsData[authorshipType].get(metricType)?.colormap.get(d.data.path) ?? "#333")
      : "#333",
  })

  return (
    <>
      <animated.path {...props} id={d.data.path} className="pointer-events-none fill-none stroke-none" />
      {isTree(d.data) ? (
        <animated.text
          className="pointer-events-none stroke-white stroke-[7px] font-mono text-sm font-bold"
          strokeLinecap="round"
        >
          <textPath startOffset="50%" dominantBaseline="central" textAnchor="middle" xlinkHref={`#${d.data.path}`}>
            {displayText}
          </textPath>
        </animated.text>
      ) : null}
      <animated.text {...textProps} className="pointer-events-none">
        <textPath
          className={clsx("font-mono", className, {
            "text-sm font-bold": isTree(d.data),
            "text-xs": !isTree(d.data),
          })}
          startOffset="50%"
          dominantBaseline="central"
          textAnchor="middle"
          xlinkHref={`#${d.data.path}`}
        >
          {displayText}
        </textPath>
      </animated.text>
    </>
  )
}

function RectText({
  d,
  displayText,
  isSearchMatch,
  className = "",
}: {
  d: HierarchyRectangularNode<HydratedGitObject>
  displayText: string
  isSearchMatch: boolean
  className?: string
}) {
  const [metricsData] = useMetrics()
  const { authorshipType, metricType } = useOptions()

  const xOffset = isTree(d.data) ? treemapTreeTextOffsetX : treemapBlobTextOffsetX
  const yOffset = isTree(d.data) ? treemapTreeTextOffsetY : treemapBlobTextOffsetY

  const props = useToggleableSpring({
    x: d.x0 + xOffset,
    y: d.y0 + yOffset,
    fill: isSearchMatch
      ? searchMatchColor
      : isBlob(d.data)
      ? getTextColorFromBackground(metricsData[authorshipType].get(metricType)?.colormap.get(d.data.path) ?? "#333")
      : "#333",
  })

  return (
    <animated.text
      {...props}
      className={clsx("pointer-events-none", className, {
        "font-bold": isTree(d.data),
      })}
    >
      {displayText}
    </animated.text>
  )
}

function createPartitionedHiearchy(
  data: HydratedGitCommitObject,
  size: { height: number; width: number },
  chartType: ChartType,
  path: string
) {
  const root = data.tree as HydratedGitTreeObject

  let currentTree = root
  const steps = path.substring(data.tree.name.length + 1).split("/")

  for (let i = 0; i < steps.length; i++) {
    for (const child of currentTree.children) {
      if (child.type === "tree") {
        const childSteps = child.name.split("/")
        if (childSteps[0] === steps[i]) {
          currentTree = child
          i += childSteps.length - 1
          break
        }
      }
    }
  }

  const castedTree = currentTree as HydratedGitObject

  const hiearchy = hierarchy(castedTree)
    .sum((d) => {
      const lineCount = (d as HydratedGitBlobObject).sizeInBytes
      return lineCount ? lineCount : 1
    })
    .sort((a, b) => (b.value !== undefined && a.value !== undefined ? b.value - a.value : 0))

  switch (chartType) {
    case "TREE_MAP":
      const treeMapPartition = treemap<HydratedGitObject>()
        .tile(treemapBinary)
        .size([size.width, size.height])
        .paddingInner(2)
        .paddingOuter(4)
        .paddingTop(treemapPaddingTop)

      const tmPartition = treeMapPartition(hiearchy)

      filterTree(tmPartition, (child) => {
        const cast = child as HierarchyRectangularNode<HydratedGitObject>
        return (isBlob(child.data) && cast.x0 >= 1 && cast.y0 >= 1) || isTree(child.data)
      })

      return tmPartition

    case "BUBBLE_CHART":
      const bubbleChartPartition = pack<HydratedGitObject>()
        .size([size.width, size.height - estimatedLetterHeightForDirText])
        .padding(bubblePadding)

      const bPartition = bubbleChartPartition(hiearchy)

      filterTree(bPartition, (child) => {
        const cast = child as HierarchyCircularNode<HydratedGitObject>
        return (isBlob(child.data) && cast.r >= 1) || isTree(child.data)
      })

      return bPartition
    default:
      throw Error("Invalid chart type")
  }
}

function filterTree(
  node: HierarchyNode<HydratedGitObject>,
  filter: (child: HierarchyNode<HydratedGitObject>) => boolean
) {
  node.children = node.children?.filter((c) => filter(c))
  for (const child of node.children ?? []) {
    if ((child.children?.length ?? 0) > 0) filterTree(child, filter)
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

function roundedRectPathFromRect(x: number, y: number, width: number, height: number, radius: number) {
  radius = Math.min(radius, Math.floor(width / 3), Math.floor(height / 3))
  return `M${x + radius},${y}
          h${width - radius * 2}
          a${radius},${radius} 0 0 1 ${radius},${radius}
          v${height - radius * 2}
          a${radius},${radius} 0 0 1 ${-radius},${radius}
          h${-width + radius * 2}
          a${radius},${radius} 0 0 1 ${-radius},${-radius}
          v${-height + radius * 2}
          a${radius},${radius} 0 0 1 ${radius},${-radius}
          z`
}
