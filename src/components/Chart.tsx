import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, partition, treemap, treemapResquarify } from "d3-hierarchy"
import { useDeferredValue, useEffect, useMemo, startTransition, useRef } from "react"
import { type JSX } from "react"
import type { GitObject, GitTreeObject, DatabaseInfo } from "~/shared/model"
import { useComponentSize, useKey, useZoomToParent } from "~/hooks"
import {
  bubblePadding,
  letterWidthForTreeText,
  circleTreeTextOffsetY,
  treemapBlobBorderRadius,
  treemapPaddingTop,
  circleBlobTextOffsetY,
  treemapPaddingInner,
  treemapPaddingOuter,
  letterWidthForBlobText,
  treemapTreeBorderRadius,
  letterHeightText,
  clipPathPadding
} from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import type { LayoutType } from "~/layouts/layouts"
import { useOptions } from "~/contexts/OptionsContext"
import { isBlob, isTree, trimFilenameFromPath, isRepositoryRoot } from "~/shared/util"
import clsx from "clsx"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { useSearch } from "~/contexts/SearchContext"
import { cn } from "~/styling"
import { useQueryState } from "nuqs"
import { useIsCategorySelected as useIsCategorySelected, useSelectedCategories } from "~/state/stores/selection"
import {
  useBlobColors,
  useSetClickedObjectPath,
  useClickedObjectPath,
  useClickedObjectIsZoomPath
} from "~/state/stores/clicked-object"
import { useHoveredObject, useSetHoveredObject } from "~/state/stores/hovered-object"
import { filterTree, flattenTree } from "~/shared/utils/tree"
import { useGradient } from "~/hooks/svg"
import { LastChangedMetric } from "~/metrics/lastChanged"
import { viewSearchParamsConfig } from "~/shared/viewParams"
import type { SegmentBucket } from "~/metrics/metrics"

type CircleOrRectHiearchyNode = HierarchyCircularNode<GitObject> | HierarchyRectangularNode<GitObject>

export function Chart() {
  const hoveredObject = useHoveredObject()
  const setHoveredObject = useSetHoveredObject()
  const [ref, rawSize] = useComponentSize()
  const { searchResults, hasSearchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { databaseInfo } = useData()
  const [metricsData] = useMetrics()
  const {
    chartType,
    sizeMetric,
    hierarchyType,
    labelsVisible,
    renderCutOff,
    metricType,
    showFilesWithoutChanges,
    showOnlySearchMatches
  } = useOptions()
  const selectedCategories = useSelectedCategories()
  const isCategorySelected = useIsCategorySelected()
  const clickedObjectPath = useClickedObjectPath()
  const setClickedObjectPath = useSetClickedObjectPath()

  const clickedObjectIsZoomPath = useClickedObjectIsZoomPath()

  const [zoomPath, setZoomPathRaw] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)

  const setZoomPath = (value: string | null) => {
    return setZoomPathRaw(value && value !== databaseInfo.repo ? trimFilenameFromPath(value) : null)
  }

  const zoomToParent = useZoomToParent()

  useKey({ key: "Escape" }, () => {
    setClickedObjectPath(null)
  })

  const filetree = useMemo(() => {
    const tree = filterTree(databaseInfo.fileTree, (node) => {
      if (hasSearchResults && !searchResults[node.path] && showOnlySearchMatches) return false
      if (!showFilesWithoutChanges && !databaseInfo.commitCounts[node.path]) return false
      return true
    })
    if (hierarchyType === "NESTED") return tree
    return {
      ...tree,
      children: flattenTree(tree)
    } as GitTreeObject
  }, [
    databaseInfo.fileTree,
    databaseInfo.commitCounts,
    hierarchyType,
    hasSearchResults,
    searchResults,
    showOnlySearchMatches,
    showFilesWithoutChanges
  ])

  const lastChangedBuckets = useMemo(() => metricsData.get("LAST_CHANGED")?.buckets, [metricsData])

  const nodes = useMemo(() => {
    if (process.env["NODE_ENV"] === "development") {
      // console.time("Create and pack hiearchy")
    }
    if (size.width === 0 || size.height === 0) return []

    const res = createPartitionedHiearchy({
      databaseInfo,
      tree: filetree,
      size: {
        height: size.height,
        width: size.width
      },
      chartType,
      sizeMetricType: sizeMetric,
      renderCutOff,
      lastChangedBuckets
    }).descendants()
    if (process.env["NODE_ENV"] === "development") {
      // console.timeEnd("Create and pack hiearchy")
    }
    return res
  }, [size.height, size.width, chartType, sizeMetric, renderCutOff, databaseInfo, filetree, lastChangedBuckets])

  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, size, setHoveredObject])

  const zoomPathIsRepo = isRepositoryRoot(databaseInfo.fileTree)

  const scrollDeltaRef = useRef(0)
  const clickTimer = useRef<number | null>(null)
  const DOUBLE_CLICK_DELAY = 300
  const getPathFromEventTarget = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<SVGElement>("[data-path]")?.dataset.path : undefined

  return (
    <div
      className={cn("relative grid overflow-hidden", {
        "pb-4": chartType === "BUBBLE_CHART"
      })}
    >
      <div ref={ref} className="relative">
        <svg
          className={clsx(
            "stroke-border dark:stroke-border-dark absolute inset-0 fill-gray-900 text-xs select-none dark:fill-gray-100",
            {
              "cursor-zoom-out": clickedObjectIsZoomPath && !zoomPathIsRepo
            }
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${size.width} ${size.height}`}
          onClick={(evt) => {
            const path = getPathFromEventTarget(evt.target)
            if (!path) {
              if (!clickedObjectIsZoomPath) {
                setClickedObjectPath(null)
                return
              }
              if (clickedObjectIsZoomPath && !zoomPathIsRepo) {
                zoomToParent()
              }
              return
            }

            evt.stopPropagation()

            if (clickTimer.current) {
              return
            }
            clickTimer.current = window.setTimeout(() => {
              clickTimer.current = null

              if (path && clickedObjectPath === path) {
                setClickedObjectPath(null)
                return
              }

              if (!path) {
                throw new Error("Clicked object not found on node")
              }
              // Else, navigate to object details
              setClickedObjectPath(path)
            }, DOUBLE_CLICK_DELAY)
          }}
          onDoubleClick={(evt) => {
            const path = getPathFromEventTarget(evt.target)
            if (!path) {
              setClickedObjectPath(null)
              return
            }
            setZoomPath(null)

            evt.stopPropagation()

            if (clickTimer.current) {
              window.clearTimeout(clickTimer.current)
              clickTimer.current = null

              if (zoomPath && zoomPath === path) {
                setZoomPath("")
                return
              }
              setZoomPath(path ?? null)
            }
          }}
          onMouseOver={(evt) => {
            const path = getPathFromEventTarget(evt.target)
            if (!path) {
              return
            }
            evt.stopPropagation()

            const newClickedObject = databaseInfo.objectPathMap[path]

            if (newClickedObject && hoveredObject?.path !== newClickedObject.path) setHoveredObject(newClickedObject)
          }}
          onMouseOut={() => {
            return setHoveredObject(null)
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
                zoomToParent()
              })
              scrollDeltaRef.current = 0
            }
          }}
        >
          {nodes.map((d, i) => {
            const isSearchMatch = Boolean(searchResults[d.data.path])
            const hasSearchMatches = isTree(d.data)
              ? Object.keys(searchResults).some((resultPath) => {
                  return resultPath.startsWith(`${d.data.path}/`)
                })
              : isSearchMatch

            const getCategoriesFromNode = (node: GitObject): string[] => {
              return (
                metricsData
                  .get(metricType)
                  ?.categoriesMap.get(node.path)
                  ?.map((c) => c.category) ?? []
              )
            }

            const nodeMatchesSelectedCategory = (node: GitObject): boolean => {
              if (getCategoriesFromNode(node).some((category) => isCategorySelected(category))) {
                return true
              }

              return isTree(node) && node.children.some(nodeMatchesSelectedCategory)
            }

            const isSelected = selectedCategories.length === 0 || nodeMatchesSelectedCategory(d.data)

            const isClickedObject = d.data.path === clickedObjectPath

            const shouldColor = clickedObjectPath
              ? // we are the clicked object, so should be highlighted
                isClickedObject || (d.data.path.startsWith(clickedObjectPath + "/") && isSelected) // or we are a child of a clicked tree object
              : isSelected

            const shouldNotColor = (hasSearchResults && !(isSearchMatch || hasSearchMatches)) || !shouldColor

            return (
              <g
                key={d.data.path}
                data-path={d.data.path}
                className={cn("cursor-pointer duration-400", {
                  "hover:opacity-80": isBlob(d.data) && !clickedObjectIsZoomPath,
                  "hover:stroke-border-highlight dark:hover:stroke-border-highlight-dark":
                    isTree(d.data) && !clickedObjectPath,
                  "opacity-10 grayscale hover:opacity-100 hover:grayscale-0": shouldNotColor
                })}
              >
                <Node d={d} isRoot={i === 0} />
                {labelsVisible ? (
                  <NodeText isSearchMatch={isSearchMatch} d={d}>
                    {d.data.name}
                    {/* TODO: After adding absolutePaths to objects, display the absolute path on the root tree */}
                    {/* {i === 0 ? d.data.absolutePath : d.data.name} */}
                  </NodeText>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function Node({ d, isRoot }: { d: CircleOrRectHiearchyNode; isRoot: boolean }) {
  const { chartType, transitionsEnabled } = useOptions()

  const clickedObjectPath = useClickedObjectPath()
  const colors = useBlobColors(d.data)

  const { linearGradient, fill } = useGradient(colors)
  const multipleColors = colors.length > 1

  const isClickedObject = d.data.path === clickedObjectPath

  const commonProps = useMemo(() => {
    const borderRadius = isRoot ? 12 : treemapTreeBorderRadius
    let props: JSX.IntrinsicElements["rect"] = isBlob(d.data)
      ? {
          fill: multipleColors ? fill : colors[0],
          stroke: "transparent"
        }
      : {
          strokeWidth: isClickedObject ? "2px" : "1px"
          // // stroke: isClickedObject? (clickedObjectColor?? undefined
          // ) : undefined
        }

    if (chartType === "BUBBLE_CHART") {
      const circleDatum = d as HierarchyCircularNode<GitObject>
      props = {
        ...props,
        x: circleDatum.x - circleDatum.r,
        y: circleDatum.y - circleDatum.r + letterHeightText - 1,
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
          ? { rx: borderRadius, ry: borderRadius }
          : { rx: treemapBlobBorderRadius, ry: treemapBlobBorderRadius })
      }
    }
    return props
  }, [isRoot, d, colors, multipleColors, fill, isClickedObject, chartType])

  return (
    <>
      {multipleColors ? <defs>{linearGradient}</defs> : null}
      <rect
        {...commonProps}
        data-path={d.data.path}
        className={cn(
          isTree(d.data) && (chartType === "BUBBLE_CHART" || !isRoot)
            ? "stroke-inherit"
            : "stroke-transparent stroke-0",
          {
            "fill-primary-bg dark:fill-primary-bg-dark": isTree(d.data),
            "transition-[x,y,rx,ry,width,height,fill] duration-500 ease-in-out": transitionsEnabled
          }
        )}
      />
    </>
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
  const isBubbleChart = isCircularNode(d)
  const colors = useBlobColors(d.data)

  if (children === null) return null

  const textPathProps = {
    startOffset: isBubbleChart ? "50%" : undefined,
    dominantBaseline: isBubbleChart ? (isTree(d.data) ? "central" : "hanging") : "hanging",
    textAnchor: isBubbleChart ? "middle" : "start",
    href: `#path-${d.data.hash}`,
    className: "font-bold tracking-widest"
  } as const
  const textClipPathRadius = isCircularNode(d) ? d.r * 2 - bubblePadding / 2 : 0

  let textShouldBeCentered = false

  if (isCircularNode(d)) {
    // Hide curved text for small nodes
    if (isBlob(d.data)) {
      if (textClipPathRadius > d.data.name.length * letterWidthForBlobText) {
        textShouldBeCentered = true
      }

      // For blobs in circular layout with straight text, check if text fits within blob height, as the rest is clipped
      if (textClipPathRadius < letterHeightText) {
        return null
      }
    } else if (
      // For blobs with curved text and trees, check if arc length is enough to fit text
      d.r < (isTree(d.data) ? letterHeightText : letterHeightText) * 2 ||
      d.r * Math.PI * (2 / 3) < d.data.name.length * letterWidthForTreeText
    ) {
      return null
    }
  } else {
    const rectNode = d as HierarchyRectangularNode<GitObject>
    if (isBlob(d.data)) {
      if (rectNode.y1 - rectNode.y0 - clipPathPadding < letterHeightText) {
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
          id={`path-${d.data.hash}`}
        />
        {/* // Clip path for blob text, so they don't exceed the blob boundaries */}
        <clipPath id={`clip-path-${d.data.hash}`}>
          <rect
            stroke="red"
            fill="transparent"
            {...(isCircularNode(d)
              ? {
                  x: d.x - d.r + clipPathPadding / 4 + 0.5,
                  y: d.y - d.r + letterHeightText - 1 + clipPathPadding / 4 + 0.5,
                  width: Math.max(textClipPathRadius - 1, 0),
                  height: Math.max(d.r * 2 - clipPathPadding / 2 - 1, 0),
                  rx: d.r,
                  ry: d.r
                }
              : {
                  x: (d as HierarchyRectangularNode<GitObject>).x0 + clipPathPadding / 2,
                  y: (d as HierarchyRectangularNode<GitObject>).y0,
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
        {...(!isCircularNode(d) || isBlob(d.data) ? { clipPath: `url(#clip-path-${d.data.hash})` } : {})}
        x={
          isCircularNode(d)
            ? isTree(d.data)
              ? 0
              : d.x - (textShouldBeCentered ? 0 : d.r - bubblePadding / 2)
            : d.x0 + clipPathPadding / 2
        }
        y={isCircularNode(d) ? (isTree(d.data) ? 0 : d.y + letterHeightText / 2) : d.y0 + clipPathPadding / 2}
        className={cn("pointer-events-none stroke-none transition-all", {
          "font-bold underline": isSearchMatch,
          "font-bold": isTree(d.data)
        })}
        style={
          isBlob(d.data)
            ? {
                fill: `contrast-color(${colors.length > 1 || colors.length === 0 ? "#ffffff" : colors[0]})`
              }
            : undefined
        }
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
  renderCutOff,
  lastChangedBuckets
}: {
  databaseInfo: DatabaseInfo
  tree: GitTreeObject
  size: { height: number; width: number }
  chartType: LayoutType
  sizeMetricType: SizeMetricType
  renderCutOff: number
  lastChangedBuckets?: readonly SegmentBucket[]
}) {
  const bucketsForLastChanged =
    sizeMetricType === "LAST_CHANGED" ? (lastChangedBuckets ?? LastChangedMetric.getBuckets(databaseInfo)) : undefined

  const hiearchy = hierarchy<GitObject>(tree)
    .sum((obj) => {
      if (isTree(obj)) return 0
      switch (sizeMetricType) {
        case "FILE_SIZE":
          return obj.byteSize ?? 1
        case "MOST_COMMITS":
          return databaseInfo.commitCounts[obj.path] ?? 1
        case "EQUAL_SIZE":
          return 1
        case "LAST_CHANGED": {
          const maxIndex = bucketsForLastChanged?.length ?? 0
          return 2 ** (maxIndex - LastChangedMetric.getBucketIndex(obj, databaseInfo, bucketsForLastChanged))
        }
        // return (
        //   (databaseInfo.lastChanged[obj.path] ?? databaseInfo.oldestChangeDate + 1) - databaseInfo.oldestChangeDate
        // )
        case "MOST_CONTRIBUTIONS":
          return databaseInfo.contribSumPerFile[obj.path] ?? 1
      }
    })
    .sort((a, b) => (b.value ?? 1) - (a.value ?? 1))

  const cutOff = Number.isNaN(renderCutOff) ? 2 : renderCutOff

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
        : partition<GitObject>().size([size.width, size.height]).padding(0)

    const tmPartition = treeMapPartition(hiearchy)

    filterVisualization(tmPartition, (child) => {
      const cast = child as HierarchyRectangularNode<GitObject>
      return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
    })

    return tmPartition
  }
  if (chartType === "BUBBLE_CHART") {
    const bubbleChartPartition = pack<GitObject>()
      .size([size.width, size.height - letterHeightText])
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
