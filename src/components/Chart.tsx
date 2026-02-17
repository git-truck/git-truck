import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, partition, treemap, treemapResquarify } from "d3-hierarchy"
import type { JSX, DOMAttributes } from "react"
import { useDeferredValue, memo, useEffect, useMemo, startTransition, useRef } from "react"
import { href, useMatch, useNavigate } from "react-router"
import type { GitBlobObject, GitObject, GitTreeObject, DatabaseInfo } from "~/shared/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useComponentSize } from "~/hooks"
import {
  bubblePadding,
  letterHeightForTreeText,
  letterWidthForTreeText,
  circleTreeTextOffsetY,
  treemapBlobBorderRadius,
  treemapPaddingTop,
  circleBlobTextOffsetY,
  missingInMapColor,
  noEntryColor,
  treemapPaddingInner,
  treemapPaddingOuter,
  letterWidthForBlobText as letterWidthForBlobText,
  treemapTreeBorderRadius,
  letterHeightForBlobText,
  clipPathPadding
} from "../const"
import { useData } from "../contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import type { ChartType } from "../contexts/OptionsContext"
import { useOptions } from "../contexts/OptionsContext"
import { isDarkColor, isBlob, isTree, trimFilenameFromPath } from "~/shared/util"
import clsx from "clsx"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { useSearch } from "~/contexts/SearchContext"
import ignore, { type Ignore } from "ignore"
import { cn } from "~/styling"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import { useQueryStates } from "nuqs"
import { mdiMagnifyMinus, mdiUndo } from "@mdi/js"
import { Icon } from "./Icon"

type CircleOrRectHiearchyNode = HierarchyCircularNode<GitObject> | HierarchyRectangularNode<GitObject>

export const Chart = memo(function Chart({
  hoveredObject,
  setHoveredObject
}: {
  hoveredObject: GitObject | null
  setHoveredObject: (obj: GitObject | null) => void
}) {
  const [ref, rawSize] = useComponentSize()
  const { searchResults, hasSearchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { databaseInfo } = useData()
  const { chartType, sizeMetric, hierarchyType, labelsVisible, renderCutoff } = useOptions()

  const [params, setParams] = useQueryStates(viewSearchParamsConfig)
  const { zoomPath, objectPath } = params

  const setZoomPath = (zoomPathUpdate: string | null | ((prev: string | null) => string | null)) =>
    setParams((prev) => {
      const value = typeof zoomPathUpdate === "function" ? zoomPathUpdate(prev.zoomPath) : zoomPathUpdate
      return { ...prev, zoomPath: value && value !== databaseInfo.repo ? trimFilenameFromPath(value) : null }
    })

  const sep = zoomPath ? (zoomPath?.includes("/") ? "/" : "\\") : null
  const zoomOneLevelOut = () => {
    if (!sep || !zoomPath) return
    // Move up to parent
    const parentPath = zoomPath.split(sep).slice(0, -1).join(sep)
    setZoomPath(parentPath)
  }

  const { clickedObject, setClickedObject } = useClickedObject()

  const { showFilesWithoutChanges, showOnlySearchMatches } = useOptions()
  const navigate = useNavigate()

  const tabURL = useMatch(href("/view/commits")) ? "/view/commits" : "/view/details"

  const filetree = useMemo(() => {
    // TODO: make filtering faster, e.g. by not having to refetch everything every time
    const ig = ignore()
    ig.add(databaseInfo.hiddenFiles)
    const filtered = filterGitTree(databaseInfo.fileTree, {
      commitCounts: databaseInfo.commitCounts,
      showFilesWithoutChanges,
      ig,
      searchResults,
      hasSearchResults,
      showOnlySearchMatches
    })
    if (hierarchyType === "NESTED") return filtered
    return {
      ...filtered,
      children: flatten(filtered)
    } as GitTreeObject
  }, [
    databaseInfo.hiddenFiles,
    databaseInfo.fileTree,
    databaseInfo.commitCounts,
    showFilesWithoutChanges,
    searchResults,
    hasSearchResults,
    showOnlySearchMatches,
    hierarchyType
  ])

  const nodes = useMemo(() => {
    if (process.env["NODE_ENV"] === "development") {
      console.time("Create and pack hiearchy")
    }
    if (size.width === 0 || size.height === 0) return []

    const res = createPartitionedHiearchy({
      databaseInfo,
      tree: filetree,
      size,
      chartType,
      sizeMetricType: sizeMetric,
      renderCutoff,
      zoomPath: zoomPath ?? undefined
    }).descendants()
    if (process.env["NODE_ENV"] === "development") {
      console.timeEnd("Create and pack hiearchy")
    }
    return res
  }, [size, chartType, sizeMetric, zoomPath, renderCutoff, databaseInfo, filetree])
  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, size, setHoveredObject])

  const scrollDeltaRef = useRef(0)
  const clickTimer = useRef<number | null>(null)
  const DOUBLE_CLICK_DELAY = 300

  const createGroupHandlers: (d: CircleOrRectHiearchyNode | null) => DOMAttributes<SVGRectElement> = (d) => {
    const onClick = (evt: React.MouseEvent<SVGGElement, MouseEvent>) => {
      evt.stopPropagation()

      // Deselect if an object is already clicked
      if (clickedObject) {
        navigate(href("/view") + viewSerializer({ ...params, objectPath: null }), { state: { clickedObject: null } })
        return
      }

      // Else, navigate to object details
      navigate(tabURL + viewSerializer({ ...params, objectPath: d?.data.path }), {
        state: {
          clickedObject: d?.data
        }
      })
    }
    const onDoubleClick = (_evt: React.MouseEvent<SVGGElement, MouseEvent>) => {
      if (zoomPath && zoomPath === d?.data.path) {
        setZoomPath("")
        return
      }
      setZoomPath(d?.data.path ?? null)
    }
    return {
      onClick: (evt) => {
        if (clickTimer.current) {
          return
        }
        clickTimer.current = window.setTimeout(() => {
          clickTimer.current = null

          onClick(evt)
        }, DOUBLE_CLICK_DELAY)
      },
      onDoubleClick(evt) {
        evt.stopPropagation()

        if (clickTimer.current) {
          window.clearTimeout(clickTimer.current)
          clickTimer.current = null
          onDoubleClick(evt)
        }
      },
      onMouseOver: (evt) => {
        evt.stopPropagation()
        if (d) setHoveredObject(d.data)
      },
      onMouseOut: () => {
        return setHoveredObject(null)
      }
    }
  }

  return (
    <div ref={ref} className="relative grid place-items-center">
      <svg
        className={clsx(
          "stroke-border dark:stroke-border-dark absolute inset-0 grid h-full w-full place-items-center fill-gray-900 text-xs select-none dark:fill-gray-100"
        )}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        // TODO: Deselect on click outside of nodes
        // onClick={() => (zoomOutKeyActive ? zoomOneLevelOut() : clickedObject ? setClickedObject(null) : null)}
        // {...createGroupHandlers(null)}
        onDoubleClick={() => {
          setZoomPath(null)
        }}
        onWheel={(evt) => {
          // Accumulate delta
          scrollDeltaRef.current += evt.deltaY

          const SCROLL_DELTA_THRESHOLD = 50

          if (scrollDeltaRef.current <= -SCROLL_DELTA_THRESHOLD && hoveredObject) {
            startTransition(() => {
              setZoomPath(hoveredObject.path)
            })
            scrollDeltaRef.current = 0
          } else if (scrollDeltaRef.current >= SCROLL_DELTA_THRESHOLD && hoveredObject) {
            startTransition(() => {
              zoomOneLevelOut()
            })
            scrollDeltaRef.current = 0
          }
        }}
      >
        {nodes.map((d) => {
          const isSearchMatch = Boolean(searchResults[d.data.path])
          const eventHandlers = createGroupHandlers(d)
          return (
            <g
              key={d.data.path}
              className={cn(
                "duration-400",
                {
                  "hover:opacity-80": isBlob(d.data),
                  "opacity-30":
                    (!isSearchMatch && hasSearchResults) ||
                    (clickedObject?.type === "blob" && clickedObject.path !== d.data.path),
                  "hover:stroke-border-highlight dark:hover:stroke-border-highlight-dark": isTree(d.data)
                },
              )}
              {...eventHandlers}
            >
              <Node
                // key={d.data.path}
                d={d}
              />
              {labelsVisible ? (
                <NodeText
                  // key={`text|${path}|${d.data.path}|${chartType}|${sizeMetric}|${now}`}
                  isSearchMatch={isSearchMatch}
                  d={d}
                >
                  {d.data.name}
                  {/* TODO: After adding absolutePaths to objects, display the absolute path on the root tree */}
                  {/* {i === 0 ? d.data.absolutePath : d.data.name} */}
                </NodeText>
              ) : null}
            </g>
          )
        })}
      </svg>
      <div className={cn("absolute bottom-2 left-2 flex gap-2", {})}>
        {objectPath ? (
          <button className="btn" onClick={() => setClickedObject(null)}>
            Clear selection
          </button>
        ) : null}
        {zoomPath && zoomPath !== databaseInfo.repo ? (
          <>
            <button className="btn" onClick={() => setZoomPath(null)}>
              <Icon path={mdiUndo} />
              Reset zoom
            </button>
            <button className="btn" onClick={zoomOneLevelOut}>
              <Icon path={mdiMagnifyMinus} />
              Zoom out
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
})

function filterGitTree(
  tree: GitTreeObject,
  {
    commitCounts,
    searchResults,
    hasSearchResults,
    showFilesWithoutChanges,
    showOnlySearchMatches,
    ig
  }: {
    commitCounts: Record<string, number>
    searchResults: Record<string, GitObject>
    hasSearchResults: boolean
    showFilesWithoutChanges: boolean
    showOnlySearchMatches: boolean
    ig: Ignore
  }
): GitTreeObject {
  function filterNode(node: GitObject): GitObject | null {
    if (ig.ignores(node.path)) {
      return null
    }
    if (node.type === "blob") {
      if (hasSearchResults && !searchResults[node.path] && showOnlySearchMatches) {
        return null
      }
      if (!showFilesWithoutChanges && !commitCounts[node.path]) {
        return null
      }
      return node
    } else {
      // It's a tree
      const children: GitObject[] = []
      for (const child of node.children) {
        const filteredChild = filterNode(child)
        if (filteredChild !== null) {
          children.push(filteredChild)
        }
      }
      if (children.length === 0) return null
      return { type: "tree", name: node.name, path: node.path, children } as GitTreeObject
    }
  }

  let filteredTree = filterNode(tree)
  if (filteredTree === null) filteredTree = { ...tree, children: [] }
  if (filteredTree.type !== "tree") {
    throw new Error("Filtered tree must be a tree structure")
  }

  return filteredTree
}

function Node({ d }: { d: CircleOrRectHiearchyNode }) {
  const [metricsData] = useMetrics()
  const { chartType, metricType, transitionsEnabled } = useOptions()

  const commonProps = useMemo(() => {
    let props: JSX.IntrinsicElements["rect"] = {
      ...(isBlob(d.data)
        ? {
            fill: metricsData.get(metricType)?.colormap.get(d.data.path) ?? missingInMapColor,
            stroke: metricsData.get(metricType)?.colormap.get(d.data.path) ?? noEntryColor
          }
        : {
            strokeWidth: "1px"
          })
    }

    if (chartType === "BUBBLE_CHART") {
      const circleDatum = d as HierarchyCircularNode<GitObject>
      props = {
        ...props,
        x: circleDatum.x - circleDatum.r,
        y: circleDatum.y - circleDatum.r + letterHeightForTreeText - 1,
        width: circleDatum.r * 2,
        height: circleDatum.r * 2,
        rx: circleDatum.r,
        ry: circleDatum.r
      }
    } else {
      const datum = d as HierarchyRectangularNode<GitObject>

      props = {
        ...props,
        x: datum.x0 + 0.5,
        y: datum.y0 + 0.5,
        width: datum.x1 - datum.x0 - 1,
        height: datum.y1 - datum.y0 - 1,
        ...(isTree(d.data)
          ? { rx: treemapTreeBorderRadius, ry: treemapTreeBorderRadius }
          : { rx: treemapBlobBorderRadius, ry: treemapBlobBorderRadius })
      }
    }
    return props
  }, [d, metricsData, metricType, chartType])

  return (
    <rect
      {...commonProps}
      className={cn(isTree(d.data) ? "stroke-inherit" : "stroke-transparent stroke-0", {
        "fill-primary-bg dark:fill-primary-bg-dark": isTree(d.data),
        "transition-[x,y,rx,ry,width,height,fill] duration-500 ease-in-out": transitionsEnabled
      })}
    />
  )
}

function NodeText({
  d,
  isSearchMatch,
  children = null
}: {
  d: CircleOrRectHiearchyNode
  isSearchMatch?: boolean
  children?: React.ReactNode
}) {
  const [metricsData] = useMetrics()
  const { metricType } = useOptions()
  const isBubbleChart = isCircularNode(d)

  if (children === null) return null

  const colorValue = metricsData.get(metricType)?.colormap.get(d.data.path) ?? "#333"
  const contrastResult = isDarkColor(colorValue)

  const textPathProps = {
    startOffset: isBubbleChart ? "50%" : undefined,
    dominantBaseline: isBubbleChart ? (isTree(d.data) ? "central" : "hanging") : "hanging",
    textAnchor: isBubbleChart ? "middle" : "start",
    href: `#path-${d.data.path}`,
    className: "font-bold tracking-widest"
  } as const
  const textClipPathRadius = isCircularNode(d) ? d.r * 2 - bubblePadding / 2 : 0

  let textShouldBeCentered = false

  if (isCircularNode(d)) {
    // Hide curved text for small nodes
    if (isBlob(d.data)) {
      if (d.r * 2 - bubblePadding > d.data.name.length * letterWidthForBlobText) {
        textShouldBeCentered = true
      }

      // For blobs in circular layout with straight text, check if text fits within blob height, as the rest is clipped
      if (d.r * 2 - bubblePadding < letterHeightForBlobText) {
        return null
      }
    } else if (
      // For blobs with curved text and trees, check if arc length is enough to fit text
      d.r < (isTree(d.data) ? letterHeightForTreeText : letterHeightForBlobText) * 2 ||
      d.r * Math.PI * (2 / 3) < d.data.name.length * letterWidthForTreeText
    ) {
      return null
    }
  } else {
    const rectNode = d as HierarchyRectangularNode<GitObject>
    if (isBlob(d.data)) {
      if (rectNode.y1 - rectNode.y0 - clipPathPadding < letterHeightForBlobText) {
        // textShouldBeCentered = false
        return null
      }
    }
  }

  return (
    <g>
      {/* Text path for circular tree labels */}
      <defs>
        <path
          d={
            isCircularNode(d)
              ? circularPath(d.x, d.y + (isTree(d.data) ? circleTreeTextOffsetY : circleBlobTextOffsetY), d.r)
              : undefined
          }
          id={`path-${d.data.path}`}
        />
        {/* // Clip path for blob text, so they don't exceed the blob boundaries */}
        <clipPath id={`clip-path-${d.data.path}`}>
          <rect
            stroke="red"
            fill="transparent"
            {...(isCircularNode(d)
              ? {
                  x: d.x - d.r + clipPathPadding / 4 + 0.5,
                  y: d.y - d.r + letterHeightForBlobText - 1 + clipPathPadding / 4 + 0.5,
                  width: Math.max(textClipPathRadius - 1, 0),
                  height: Math.max(d.r * 2 - clipPathPadding / 2 - 1, 0),
                  rx: d.r,
                  ry: d.r
                }
              : {
                  x: (d as HierarchyRectangularNode<GitObject>).x0 + clipPathPadding / 2,
                  y: (d as HierarchyRectangularNode<GitObject>).y0 + clipPathPadding / 2,
                  width: Math.max(
                    (d as HierarchyRectangularNode<GitObject>).x1 -
                      (d as HierarchyRectangularNode<GitObject>).x0 -
                      clipPathPadding,
                    0
                  ),
                  height: Math.max(
                    (d as HierarchyRectangularNode<GitObject>).y1 -
                      (d as HierarchyRectangularNode<GitObject>).y0 -
                      clipPathPadding,
                    0
                  ),
                  ...(isTree(d.data)
                    ? { rx: treemapTreeBorderRadius, ry: treemapTreeBorderRadius }
                    : { rx: treemapBlobBorderRadius, ry: treemapBlobBorderRadius })
                })}
          />
        </clipPath>
      </defs>
      {/* For circle packing layout, tree nodes get a text node that has a stroke */}
      {isTree(d.data) && isCircularNode(d) ? (
        <text
          className={cn("stroke-primary-bg dark:stroke-primary-bg-dark pointer-events-none fill-none stroke-5")}
          strokeLinecap="round"
        >
          <textPath {...textPathProps}>{children}</textPath>
        </text>
      ) : null}
      <text
        textAnchor={textShouldBeCentered ? "middle" : undefined}
        alignmentBaseline="hanging"
        {...(!isCircularNode(d) || isBlob(d.data) ? { clipPath: `url(#clip-path-${d.data.path})` } : {})}
        x={
          isCircularNode(d)
            ? isTree(d.data)
              ? 0
              : d.x - (textShouldBeCentered ? 0 : d.r - bubblePadding / 2)
            : d.x0 + clipPathPadding / 2
        }
        y={isCircularNode(d) ? (isTree(d.data) ? 0 : d.y + letterHeightForBlobText / 2) : d.y0 + clipPathPadding / 2}
        className={cn("pointer-events-none stroke-none transition-all", {
          "font-bold underline": isSearchMatch,
          "font-bold": isTree(d.data),
          "fill-primary-text-dark": contrastResult.luminance < 0.5 && isBlob(d.data),
          "fill-primary-text": contrastResult.luminance >= 0.5 && isBlob(d.data)
        })}
      >
        {isTree(d.data) && isCircularNode(d) ? <textPath {...textPathProps}>{children}</textPath> : children}
      </text>
    </g>
  )
}

function isCircularNode(d: CircleOrRectHiearchyNode): d is HierarchyCircularNode<GitObject> {
  return typeof (d as HierarchyCircularNode<GitObject>).r === "number"
}

function createPartitionedHiearchy({
  databaseInfo,
  tree,
  size,
  chartType,
  sizeMetricType,
  renderCutoff,
  zoomPath: objectPath
}: {
  databaseInfo: DatabaseInfo
  tree: GitTreeObject
  size: { height: number; width: number }
  chartType: ChartType
  sizeMetricType: SizeMetricType
  renderCutoff: number
  zoomPath?: string
}) {
  let currentTree = tree

  // If objectPath is defined, navigate to the corresponding subtree. This allows for zooming into subtrees when clicking on them
  if (objectPath) {
    const steps = objectPath.substring(tree.name.length + 1).split("/")
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
  }

  const castedTree = currentTree as GitObject

  const hiearchy = hierarchy(castedTree)
    .sum((d) => {
      const blob = d as GitBlobObject
      switch (sizeMetricType) {
        case "FILE_SIZE":
          return blob.sizeInBytes ?? 1
        case "MOST_COMMITS":
          return databaseInfo.commitCounts[blob.path] ?? 1
        case "EQUAL_SIZE":
          return 1
        case "LAST_CHANGED":
          return (
            (databaseInfo.lastChanged[blob.path] ?? databaseInfo.oldestChangeDate + 1) - databaseInfo.oldestChangeDate
          )
        case "MOST_CONTRIBUTIONS":
          return databaseInfo.contribSumPerFile[blob.path] ?? 1
      }
    })
    .sort((a, b) => (b.value ?? 1) - (a.value ?? 1))

  const cutOff = Number.isNaN(renderCutoff) ? 2 : renderCutoff

  if (chartType === "TREE_MAP" || chartType === "PARTITION") {
    const treeMapPartition =
      chartType === "TREE_MAP"
        ? treemap<GitObject>()
            .size([size.width, size.height])
            .round(true)
            .tile(treemapResquarify)
            .paddingInner(treemapPaddingInner)
            .paddingOuter(treemapPaddingOuter)
            .paddingTop(treemapPaddingTop)
        : partition<GitObject>().size([size.width, size.height]).padding(treemapPaddingInner)

    const tmPartition = treeMapPartition(hiearchy)

    filterVisualization(tmPartition, (child) => {
      const cast = child as HierarchyRectangularNode<GitObject>
      return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
    })

    return tmPartition
  }
  if (chartType === "BUBBLE_CHART") {
    const bubbleChartPartition = pack<GitObject>()
      .size([size.width, size.height - letterHeightForTreeText])
      .padding(bubblePadding)
    const bPartition = bubbleChartPartition(hiearchy)
    filterVisualization(bPartition, (child) => {
      const cast = child as HierarchyCircularNode<GitObject>
      return cast.r >= cutOff
    })
    return bPartition
  } else {
    throw new Error("Unknown chart type: " + chartType)
  }
}

function filterVisualization(node: HierarchyNode<GitObject>, filter: (child: HierarchyNode<GitObject>) => boolean) {
  if (node.children) {
    node.children = node.children.filter((c) => filter(c))
  }
  for (const child of node.children ?? []) {
    if ((child.children?.length ?? 0) > 0) filterVisualization(child, filter)
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
function circularPath(x: number, y: number, r: number) {
  return `M${x},${y}
          m0,${r}
          a${r},${r} 0 1,1 0,${-r * 2}
          a${r},${r} 0 1,1 0,${r * 2}`
}

function flatten(tree: GitTreeObject) {
  const flattened: GitBlobObject[] = []
  for (const child of tree.children) {
    if (child.type === "blob") {
      flattened.push(child)
    } else {
      flattened.push(...flatten(child))
    }
  }
  return flattened
}
