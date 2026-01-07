import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, treemap, treemapResquarify } from "d3-hierarchy"
import { zoom, zoomIdentity } from "d3-zoom"
import { select } from "d3-selection"
import type { MouseEventHandler } from "react"
import { useDeferredValue, memo, useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { GitBlobObject, GitObject, GitTreeObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useComponentSize } from "~/hooks"
import {
  bubblePadding,
  estimatedLetterHeightForDirText,
  estimatedLetterWidth,
  circleTreeTextOffsetY,
  treemapBlobTextOffsetX,
  treemapBlobTextOffsetY,
  treemapNodeBorderRadius,
  treemapPaddingTop,
  treemapTreeTextOffsetX,
  circleBlobTextOffsetY,
  treemapTreeTextOffsetY,
  missingInMapColor
} from "../const"
import { useData } from "../contexts/DataContext"
import { useMetrics } from "../contexts/MetricContext"
import type { ChartType } from "../contexts/OptionsContext"
import { useOptions } from "../contexts/OptionsContext"
import { usePath } from "../contexts/PathContext"
import { getTextColorFromBackground, isBlob, isTree } from "~/util"
import clsx from "clsx"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { useSearch } from "~/contexts/SearchContext"
import type { DatabaseInfo } from "~/routes/$repo.$"
import ignore, { type Ignore } from "ignore"
import { cn, usePrefersLightMode } from "~/styling"
import { isChrome, isChromium, isEdgeChromium } from "react-device-detect"

type CircleOrRectHiearchyNode = HierarchyCircularNode<GitObject> | HierarchyRectangularNode<GitObject>

export const Chart = memo(function Chart({ setHoveredObject }: { setHoveredObject: (obj: GitObject | null) => void }) {
  const [ref, rawSize] = useComponentSize()
  const { searchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { databaseInfo } = useData()
  const { chartType, sizeMetric, depthType, hierarchyType, labelsVisible, renderCutoff, renderScale, setRenderScale } =
    useOptions()
  const { path } = usePath()
  const { clickedObject, setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const { showFilesWithoutChanges } = useOptions()

  // Zoom refs - use direct DOM manipulation for 60fps smooth zoom
  const svgRef = useRef<SVGSVGElement>(null)
  const transformGroupRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null)

  let numberOfDepthLevels: number | undefined = undefined
  switch (depthType) {
    case "One":
      numberOfDepthLevels = 1
      break
    case "Two":
      numberOfDepthLevels = 2
      break
    case "Three":
      numberOfDepthLevels = 3
      break
    case "Four":
      numberOfDepthLevels = 4
      break
    case "Five":
      numberOfDepthLevels = 5
      break
    case "Full":
    default:
      numberOfDepthLevels = undefined
  }

  const filetree = useMemo(() => {
    // TODO: make filtering faster, e.g. by not having to refetch everything every time
    const ig = ignore()
    ig.add(databaseInfo.hiddenFiles)
    const filtered = filterGitTree(databaseInfo.fileTree, databaseInfo.commitCounts, showFilesWithoutChanges, ig)
    if (hierarchyType === "NESTED") return filtered
    return {
      ...filtered,
      children: flatten(filtered)
    } as GitTreeObject
  }, [
    databaseInfo.fileTree,
    hierarchyType,
    databaseInfo.hiddenFiles,
    databaseInfo.commitCounts,
    showFilesWithoutChanges
  ])

  const scaledSize = useMemo(
    () => ({ width: size.width * renderScale, height: size.height * renderScale }),
    [size.width, size.height, renderScale]
  )

  // Cache for precomputed layouts at each renderScale (1-16)
  const layoutCacheRef = useRef<Map<number, ReturnType<typeof createPartitionedHiearchy>["descendants"]>>(new Map())
  const [cacheReady, setCacheReady] = useState(false)
  const [cachingProgress, setCachingProgress] = useState(0)

  // Precompute all scale layouts when dependencies change
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return

    // Clear cache when dependencies change
    layoutCacheRef.current.clear()
    setCacheReady(false)
    setCachingProgress(0)

    // Precompute layouts for scales 1-16 asynchronously
    const computeNextScale = (scale: number) => {
      if (scale > 16) {
        setCacheReady(true)
        return
      }

      // Use requestIdleCallback or setTimeout to not block UI
      const compute = () => {
        const scaledSizeForScale = { width: size.width * scale, height: size.height * scale }
        const layout = createPartitionedHiearchy(
          databaseInfo,
          filetree,
          scaledSizeForScale,
          chartType,
          sizeMetric,
          path,
          renderCutoff
        ).descendants()
        layoutCacheRef.current.set(scale, layout)
        setCachingProgress(scale)
        computeNextScale(scale + 1)
      }

      // Use requestIdleCallback if available, otherwise setTimeout
      if ("requestIdleCallback" in window) {
        requestIdleCallback(compute, { timeout: 100 })
      } else {
        setTimeout(compute, 0)
      }
    }

    computeNextScale(1)
  }, [size.width, size.height, chartType, sizeMetric, path, renderCutoff, databaseInfo, filetree])

  // Get nodes from cache or compute if not ready
  const nodes = useMemo(() => {
    if (size.width === 0 || size.height === 0) return []

    // Try to get from cache first
    const cached = layoutCacheRef.current.get(renderScale)
    if (cached) {
      return cached
    }

    // Fallback: compute on-demand if cache not ready
    console.time("nodes-fallback")
    const res = createPartitionedHiearchy(
      databaseInfo,
      filetree,
      scaledSize,
      chartType,
      sizeMetric,
      path,
      renderCutoff
    ).descendants()
    console.timeEnd("nodes-fallback")
    return res
  }, [scaledSize, chartType, sizeMetric, path, renderCutoff, databaseInfo, filetree, renderScale, cacheReady])

  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, size, setHoveredObject])

  // D3 zoom behavior for Cmd/Ctrl + scroll (smooth visual zoom)
  // Uses direct DOM manipulation for 60fps - bypasses React entirely
  useEffect(() => {
    if (!svgRef.current || !transformGroupRef.current) return

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .filter((event) => {
        // Only zoom on Cmd/Ctrl + wheel (to not interfere with page scroll)
        if (event.type === "wheel") {
          return event.metaKey || event.ctrlKey
        }
        // Allow drag for panning anytime (Google Maps style)
        // Click events on folders still work because they use onClick, not mousedown
        return event.type === "mousedown"
      })
      .on("zoom", (event) => {
        // Direct DOM manipulation - no React re-render, smooth 60fps
        const { k, x, y } = event.transform
        transformGroupRef.current?.setAttribute("transform", `translate(${x},${y}) scale(${k})`)
      })

    zoomBehaviorRef.current = zoomBehavior
    const svg = select(svgRef.current)
    svg.call(zoomBehavior)

    return () => {
      svg.on(".zoom", null)
      zoomBehaviorRef.current = null
    }
  }, [scaledSize])

  // Zoom control handlers for UI buttons
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, 1.5)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, 0.67)
  }, [])

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.transform, zoomIdentity)
  }, [])

  // Keyboard shortcuts for render scale: Shift++ (increase) and Shift+- (decrease)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey) return

      // Shift + = (plus) or Shift + + (numpad)
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        const newScale = Math.min(16, renderScale + 1)
        if (newScale !== renderScale) setRenderScale(newScale)
      }
      // Shift + - (minus)
      if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        const newScale = Math.max(1, renderScale - 1)
        if (newScale !== renderScale) setRenderScale(newScale)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [renderScale, setRenderScale])

  // Reset zoom when path changes (navigating into folders)
  useEffect(() => {
    if (transformGroupRef.current) {
      transformGroupRef.current.setAttribute("transform", "translate(0,0) scale(1)")
    }
  }, [path])

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
          onMouseOver: () => setHoveredObject(d.data as GitObject),
          onMouseOut: () => setHoveredObject(null)
        }
      : {
          onClick: (evt) => {
            evt.stopPropagation()
            setClickedObject(d.data)
            setPath(d.data.path)
          },
          onMouseOver: (evt) => {
            evt.stopPropagation()
            if (!isRoot) setHoveredObject(d.data as GitObject)
            else setHoveredObject(null)
          },
          onMouseOut: () => setHoveredObject(null)
        }
  }

  const now = isChrome || isChromium || isEdgeChromium ? Date.now() : 0 // Necessary in chrome to update text positions
  return (
    <div className="relative grid place-items-center overflow-hidden" ref={ref}>
      <svg
        ref={svgRef}
        key={`svg|${scaledSize.width}|${scaledSize.height}`}
        className={clsx("grid h-full w-full place-items-center stroke-gray-300 dark:stroke-gray-700", {
          "cursor-zoom-out": path.includes("/")
        })}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${scaledSize.width} ${scaledSize.height}`}
        onClick={() => {
          // Move up to parent
          const parentPath = path.split("/").slice(0, -1).join("/")
          // Check if parent is root
          if (parentPath === "") setPath("/")
          else setPath(parentPath)
        }}
      >
        <g ref={transformGroupRef} transform="translate(0,0) scale(1)">
          {nodes.map((d, i) => {
            return (
              <g
                key={d.data.path}
                className={clsx("transition-opacity hover:opacity-60", {
                  "cursor-pointer": i === 0,
                  "cursor-zoom-in": i > 0 && isTree(d.data),
                  "animate-blink": clickedObject?.path === d.data.path
                })}
                {...createGroupHandlers(d, i === 0)}
              >
                {(numberOfDepthLevels === undefined || d.depth <= numberOfDepthLevels) && (
                  <>
                    <Node key={d.data.path} d={d} isSearchMatch={Boolean(searchResults[d.data.path])} />
                    {labelsVisible && (
                      <NodeText
                        key={`text|${path}|${d.data.path}|${chartType}|${sizeMetric}|${now}`}
                        d={d}
                        renderScale={renderScale}
                      >
                        {collapseText({ d, isRoot: i === 0, path, displayText: d.data.name, chartType })}
                      </NodeText>
                    )}
                  </>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Zoom Controls - Google Maps style */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-lg bg-white/90 p-1 shadow-lg dark:bg-gray-800/90">
        {/* Visual zoom controls */}
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Zoom in (Cmd/Ctrl + scroll)"
        >
          <span className="text-lg font-bold">+</span>
        </button>
        <button
          onClick={handleZoomReset}
          className="flex h-8 w-8 items-center justify-center rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Reset zoom"
        >
          ⟲
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Zoom out (Cmd/Ctrl + scroll)"
        >
          <span className="text-lg font-bold">−</span>
        </button>

        <div className="my-1 border-t border-gray-300 dark:border-gray-600" />

        {/* Render scale controls */}
        <button
          onClick={() => setRenderScale(Math.min(16, renderScale + 1))}
          disabled={renderScale >= 16 || (!cacheReady && !layoutCacheRef.current.has(renderScale + 1))}
          className="flex h-8 w-8 items-center justify-center rounded text-xs hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
          title="Increase detail (Shift +)"
        >
          HD+
        </button>
        <div className="flex h-6 w-8 items-center justify-center text-xs font-medium" title="Render scale">
          {cacheReady ? `${renderScale}×` : <span className="animate-pulse text-gray-400">{cachingProgress}/16</span>}
        </div>
        <button
          onClick={() => setRenderScale(Math.max(1, renderScale - 1))}
          disabled={renderScale <= 1 || (!cacheReady && !layoutCacheRef.current.has(renderScale - 1))}
          className="flex h-8 w-8 items-center justify-center rounded text-xs hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
          title="Decrease detail (Shift -)"
        >
          HD−
        </button>
      </div>
    </div>
  )
})

function filterGitTree(
  tree: GitTreeObject,
  commitCounts: Record<string, number>,
  showFilesWithoutChanges: boolean,
  ig: Ignore
): GitTreeObject {
  function filterNode(node: GitObject): GitObject | null {
    if (ig.ignores(node.path)) {
      return null
    }
    if (node.type === "blob") {
      if (!showFilesWithoutChanges && !commitCounts[node.path]) return null
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

function Node({ d, isSearchMatch }: { d: CircleOrRectHiearchyNode; isSearchMatch: boolean }) {
  const [metricsData] = useMetrics()
  const { chartType, metricType, transitionsEnabled } = useOptions()

  const commonProps = useMemo(() => {
    let props: JSX.IntrinsicElements["rect"] = {
      strokeWidth: "1px",
      fill: isBlob(d.data)
        ? (metricsData.get(metricType)?.colormap.get(d.data.path) ?? missingInMapColor)
        : "transparent"
    }

    if (chartType === "BUBBLE_CHART") {
      const circleDatum = d as HierarchyCircularNode<GitObject>
      props = {
        ...props,
        x: circleDatum.x - circleDatum.r,
        y: circleDatum.y - circleDatum.r + estimatedLetterHeightForDirText - 1,
        width: circleDatum.r * 2,
        height: circleDatum.r * 2,
        rx: circleDatum.r,
        ry: circleDatum.r
      }
    } else {
      const datum = d as HierarchyRectangularNode<GitObject>

      props = {
        ...props,
        x: datum.x0,
        y: datum.y0,
        width: datum.x1 - datum.x0,
        height: datum.y1 - datum.y0,
        rx: treemapNodeBorderRadius,
        ry: treemapNodeBorderRadius
      }
    }
    return props
  }, [d, metricsData, metricType, chartType])

  return (
    <rect
      {...commonProps}
      className={cn(isSearchMatch ? "stroke-red-500" : isBlob(d.data) ? "stroke-transparent" : "", {
        "cursor-pointer": isBlob(d.data),
        "transition-all duration-500 ease-in-out": transitionsEnabled,
        "animate-stroke-pulse": isSearchMatch
      })}
    />
  )
}

function collapseText({
  d,
  isRoot,
  path,
  displayText,
  chartType
}: {
  d: CircleOrRectHiearchyNode
  isRoot: boolean
  path: string
  displayText: string
  chartType: ChartType
}): string | null {
  let textIsTooLong: (text: string) => boolean
  let textIsTooTall: (text: string) => boolean
  if (chartType === "BUBBLE_CHART") {
    const circleDatum = d as HierarchyCircularNode<GitObject>
    textIsTooLong = (text: string) => circleDatum.r < 50 || circleDatum.r * Math.PI < text.length * estimatedLetterWidth
    textIsTooTall = () => false
  } else {
    const datum = d as HierarchyRectangularNode<GitObject>
    textIsTooLong = (text: string) => datum.x1 - datum.x0 < text.length * estimatedLetterWidth
    textIsTooTall = () => {
      const heightAvailable = datum.y1 - datum.y0 - (isBlob(d.data) ? treemapBlobTextOffsetY : treemapTreeTextOffsetY)
      return heightAvailable < estimatedLetterHeightForDirText
    }
  }

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

  if (textIsTooLong(displayText)) {
    displayText = displayText.replace(/\/.+\//gm, "/.../")
    if (textIsTooLong(displayText)) {
      return null
    }
  }

  if (textIsTooTall && textIsTooTall(displayText)) {
    displayText = displayText.replace(/\/.+\//gm, "/.../")

    if (textIsTooTall(displayText)) {
      return null
    }
  }

  return displayText
}

function NodeText({
  d,
  children = null,
  renderScale = 1
}: {
  d: CircleOrRectHiearchyNode
  children?: React.ReactNode
  renderScale?: number
}) {
  const [metricsData] = useMetrics()
  const { metricType } = useOptions()
  const prefersLightMode = usePrefersLightMode()
  const isBubbleChart = isCircularNode(d)

  // Scale font size to compensate for viewBox scaling
  // Base sizes: text-sm = 14px, text-xs = 12px
  const baseFontSize = isTree(d.data) ? 14 : 12
  const scaledFontSize = baseFontSize * renderScale

  if (children === null) return null

  let textPathData: string

  if (isBubbleChart) {
    const yOffset = isTree(d.data) ? circleTreeTextOffsetY : circleBlobTextOffsetY
    const circleDatum = d as HierarchyCircularNode<GitObject>
    textPathData = circlePathFromCircle(circleDatum.x, circleDatum.y + yOffset, circleDatum.r)
  } else {
    const datum = d as HierarchyRectangularNode<GitObject>
    textPathData = roundedRectPathFromRect(
      datum.x0 + (isTree(d.data) ? treemapTreeTextOffsetX : treemapBlobTextOffsetX),
      datum.y0 + (isTree(d.data) ? treemapTreeTextOffsetY : treemapBlobTextOffsetY),
      datum.x1 - datum.x0,
      datum.y1 - datum.y0,
      0
    )
  }

  const fillColor = isBlob(d.data)
    ? getTextColorFromBackground(metricsData.get(metricType)?.colormap.get(d.data.path) ?? "#333")
    : prefersLightMode
      ? "#333"
      : "#fff"

  const textPathBaseProps = {
    startOffset: isBubbleChart ? "50%" : undefined,
    dominantBaseline: isBubbleChart ? (isTree(d.data) ? "central" : "hanging") : "hanging",
    textAnchor: isBubbleChart ? "middle" : "start",
    href: `#path-${d.data.path}`
  }

  return (
    <>
      <path d={textPathData} id={`path-${d.data.path}`} className="hidden" />
      {isTree(d.data) && isBubbleChart ? (
        <text
          className="pointer-events-none fill-none stroke-gray-100 font-mono font-bold dark:stroke-gray-800"
          style={{ fontSize: scaledFontSize, strokeWidth: 7 * renderScale }}
          strokeLinecap="round"
        >
          <textPath {...textPathBaseProps}>{children}</textPath>
        </text>
      ) : null}
      <text fill={fillColor} className="pointer-events-none stroke-none">
        <textPath
          {...textPathBaseProps}
          className={clsx("stroke-none font-mono", {
            "font-bold": isTree(d.data)
          })}
          style={{ fontSize: scaledFontSize }}
        >
          {children}
        </textPath>
      </text>
    </>
  )
}

function isCircularNode(d: CircleOrRectHiearchyNode) {
  return typeof (d as HierarchyCircularNode<GitObject>).r === "number"
}

function createPartitionedHiearchy(
  databaseInfo: DatabaseInfo,
  tree: GitTreeObject,
  size: { height: number; width: number },
  chartType: ChartType,
  sizeMetricType: SizeMetricType,
  path: string,
  renderCutoff: number
) {
  let currentTree = tree
  const steps = path.substring(tree.name.length + 1).split("/")
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
        case "MOST_CONTRIBS":
          return databaseInfo.contribSumPerFile[blob.path] ?? 1
      }
    })
    .sort((a, b) => (b.value ?? 1) - (a.value ?? 1))

  const cutOff = Number.isNaN(renderCutoff) ? 2 : renderCutoff

  if (chartType === "TREE_MAP") {
    const treeMapPartition = treemap<GitObject>()
      .tile(treemapResquarify)
      .size([size.width, size.height])
      .paddingInner(2)
      .paddingOuter(4)
      .paddingTop(treemapPaddingTop)

    const tmPartition = treeMapPartition(hiearchy)

    filterTree(tmPartition, (child) => {
      const cast = child as HierarchyRectangularNode<GitObject>
      return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
    })

    return tmPartition
  }
  if (chartType === "BUBBLE_CHART") {
    const bubbleChartPartition = pack<GitObject>()
      .size([size.width, size.height - estimatedLetterHeightForDirText])
      .padding(bubblePadding)
    const bPartition = bubbleChartPartition(hiearchy)
    filterTree(bPartition, (child) => {
      const cast = child as HierarchyCircularNode<GitObject>
      return cast.r >= cutOff
    })
    return bPartition
  } else {
    throw new Error("Unknown chart type: " + chartType)
  }
}

function filterTree(node: HierarchyNode<GitObject>, filter: (child: HierarchyNode<GitObject>) => boolean) {
  // Iterative approach to avoid stack overflow with large repos (35K+ files)
  const stack: HierarchyNode<GitObject>[] = [node]

  while (stack.length > 0) {
    const current = stack.pop()!
    current.children = current.children?.filter((c) => filter(c))
    for (const child of current.children ?? []) {
      if ((child.children?.length ?? 0) > 0) {
        stack.push(child)
      }
    }
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

function flatten(tree: GitTreeObject) {
  // Iterative approach to avoid stack overflow with large repos (35K+ files)
  const flattened: GitBlobObject[] = []
  const stack: GitTreeObject[] = [tree]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const child of current.children) {
      if (child.type === "blob") {
        flattened.push(child)
      } else {
        stack.push(child)
      }
    }
  }
  return flattened
}
