import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, partition, treemap, treemapResquarify } from "d3-hierarchy"
import { useDeferredValue, useEffect, useMemo, startTransition, useRef } from "react"
import { type JSX, type DOMAttributes, useId } from "react"
import type { GitBlobObject, GitObject, GitTreeObject, DatabaseInfo } from "~/shared/model"
import { useComponentSize, useKey } from "~/hooks"
import {
  bubblePadding,
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
  letterHeightText,
  clipPathPadding,
  UNKNOWN_CATEGORY
} from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import type { LayoutType } from "~/layouts/layouts"
import { useOptions } from "~/contexts/OptionsContext"
import { isDarkColor, isBlob, isTree, trimFilenameFromPath } from "~/shared/util"
import clsx from "clsx"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { useSearch } from "~/contexts/SearchContext"
import ignore, { type Ignore } from "ignore"
import { cn } from "~/styling"
import { useQueryState } from "nuqs"
import { mdiMagnifyMinus, mdiUndo } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useIsCategorySelected as useIsCategorySelected, useSelectedCategories } from "~/state/stores/selection"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { useHoveredObject, useSetHoveredObject } from "~/state/stores/hovered-object"
import { ZoomToSelectedObjectButton } from "~/components/buttons/ZoomToSelectedObjectButton"

type CircleOrRectHiearchyNode = HierarchyCircularNode<GitObject> | HierarchyRectangularNode<GitObject>

export function Chart() {
  const hoveredObject = useHoveredObject()
  const setHoveredObject = useSetHoveredObject()
  const [ref, rawSize] = useComponentSize()
  const { searchResults, hasSearchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { databaseInfo } = useData()
  const [metricsData] = useMetrics()
  const { chartType, sizeMetric, hierarchyType, labelsVisible, renderCutOff } = useOptions()
  const selectedCategories = useSelectedCategories()
  const isCategorySelected = useIsCategorySelected()

  const [zoomPath, setZoomPathRaw] = useQueryState("zoomPath")

  const setZoomPath = (value: string | null) => {
    return setZoomPathRaw(value && value !== databaseInfo.repo ? trimFilenameFromPath(value) : null)
  }

  const sep = zoomPath ? (zoomPath?.includes("/") ? "/" : "\\") : null
  const zoomOneLevelOut = () => {
    if (!sep || !zoomPath) return
    // Move up to parent
    const parentPath = zoomPath.split(sep).slice(0, -1).join(sep)
    setZoomPath(parentPath)
  }

  const setClickedObject = useSetClickedObject()
  const clickedObject = useClickedObject()

  const { metricType, showFilesWithoutChanges, showOnlySearchMatches } = useOptions()

  useKey({ key: "Escape" }, () => {
    if (clickedObject) {
      setClickedObject(null)
    }
  })

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
      renderCutOff
    }).descendants()
    if (process.env["NODE_ENV"] === "development") {
      console.timeEnd("Create and pack hiearchy")
    }
    return res
  }, [size, chartType, sizeMetric, renderCutOff, databaseInfo, filetree])
  useEffect(() => {
    setHoveredObject(null)
  }, [chartType, size, setHoveredObject])

  const scrollDeltaRef = useRef(0)
  const clickTimer = useRef<number | null>(null)
  const DOUBLE_CLICK_DELAY = 300

  // TODO: This is very inefficient, as it forces all nodes to rerender each time. Instead, Nodes should manage their own handlers or, use delegate events on svg root
  const createGroupHandlers: (d: CircleOrRectHiearchyNode | null) => DOMAttributes<SVGRectElement> = (d) => {
    const onClick = (_evt: React.MouseEvent<SVGGElement, MouseEvent>) => {
      // If clicking the same object, deselect

      if (clickedObject && d && clickedObject.path === d.data.path) {
        setClickedObject(null)
        return
      }

      // Else, navigate to object details
      setClickedObject(d ? d.data : null)
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
        evt.stopPropagation()

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
        onClick={() => (clickedObject ? setClickedObject(null) : null)}
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
          const hasSearchMatches = isTree(d.data)
            ? Object.keys(searchResults).some((resultPath) => {
                return resultPath.startsWith(`${d.data.path}/`)
              })
            : isSearchMatch
          const eventHandlers = createGroupHandlers(d)

          const getCategoriesFromNode: (go: GitObject) => string[] = (node: GitObject) => {
            const cats: Array<string> =
              metricsData
                .get(metricType)
                ?.categoriesMap.get(node.path)
                ?.map((c) => c.category) ?? []
            return cats
          }

          const categories = getCategoriesFromNode(d.data)
          const isSelected =
            selectedCategories.length > 0
              ? // do we have contain a selected category?
                categories.some((c) => isCategorySelected(c)) ||
                // or we have a child that has a selected category selected
                (isTree(d.data) &&
                  d.data.children.some((node) => getCategoriesFromNode(node).some((c) => isCategorySelected(c))))
              : // or by default, if no categories are selected, everything should be considered selected
                true

          const shouldColor = clickedObject
            ? // we are the clicked object, so should be highlighted
              d.data.path === clickedObject.path ||
              (isTree(clickedObject) && d.data.path.startsWith(clickedObject.path + "/") && isSelected) // or we are a child of a clicked tree object
            : isSelected

          const shouldNotColor = (hasSearchResults && !(isSearchMatch || hasSearchMatches)) || !shouldColor

          return (
            <g
              key={d.data.path}
              className={cn("cursor-pointer duration-400", {
                "hover:opacity-80": isBlob(d.data) && !clickedObject,
                "hover:stroke-border-highlight dark:hover:stroke-border-highlight-dark":
                  isTree(d.data) && !clickedObject,
                "opacity-10 grayscale hover:opacity-100 hover:grayscale-0": shouldNotColor
              })}
              {...eventHandlers}
            >
              <Node d={d} />
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
      <div className="absolute bottom-2 left-2 flex gap-2">
        <ZoomToSelectedObjectButton />
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
}

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
  const gradientId = useId()
  const [metricsData] = useMetrics()
  const { chartType, metricType, transitionsEnabled } = useOptions()
  const selectedCategories = useSelectedCategories()
  const isSelected = useIsCategorySelected()

  const noCategoriesSelected = selectedCategories.filter((c) => c.startsWith(`${metricType}:`)).length === 0

  let colors: { category: string; color: string }[] = [metricsData.get(metricType)].flatMap(
    (c) => c?.categoriesMap?.get(d.data.path)?.filter((c) => isSelected(c.category) || noCategoriesSelected) ?? []
  )

  if ((colors?.length ?? 0) === 0 && isBlob(d.data)) {
    colors = [{ category: UNKNOWN_CATEGORY, color: missingInMapColor }]
  }
  const multipleColors = Array.isArray(colors) && colors.length > 1

  const commonProps = useMemo(() => {
    let props: JSX.IntrinsicElements["rect"] = isBlob(d.data)
      ? {
          fill: colors ? (multipleColors ? `url('#${gradientId}')` : colors[0].color) : missingInMapColor,
          stroke: colors ? colors[0].color : noEntryColor
        }
      : {
          // strokeWidth: "1px"
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
          ? { rx: treemapTreeBorderRadius, ry: treemapTreeBorderRadius }
          : { rx: treemapBlobBorderRadius, ry: treemapBlobBorderRadius })
      }
    }
    return props
  }, [d, colors, multipleColors, gradientId, chartType])

  return (
    <>
      {multipleColors ? (
        <defs>
          {/* <radialGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {colors.map((color, i) => (
            <stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={color.color} />
          ))}
        </radialGradient> */}
          {/* <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%"> */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            {colors.map((color, i) => (
              <stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={color.color} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <rect
        {...commonProps}
        className={cn(isTree(d.data) ? "stroke-inherit" : "stroke-transparent stroke-0", {
          "fill-primary-bg dark:fill-primary-bg-dark": isTree(d.data),
          "transition-[x,y,rx,ry,width,height,fill] duration-500 ease-in-out": transitionsEnabled
        })}
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
  // const [metricsData] = useMetrics()
  // const { metricType } = useOptions()
  const isBubbleChart = isCircularNode(d)

  if (children === null) return null

  // const colorValue = metricsData.get(metricType)?.categoriesMap.get(d.data.path) ?? "#333"
  // const contrastResult = isDarkColor(colorValue)
  // TODO: what to do for gradients?
  const contrastResult = isDarkColor("#ffffff")

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
      if (d.r * 2 - bubblePadding < letterHeightText) {
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
                  y: d.y - d.r + letterHeightText - 1 + clipPathPadding / 4 + 0.5,
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
        y={isCircularNode(d) ? (isTree(d.data) ? 0 : d.y + letterHeightText / 2) : d.y0 + clipPathPadding / 2}
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
  renderCutOff
}: {
  databaseInfo: DatabaseInfo
  tree: GitTreeObject
  size: { height: number; width: number }
  chartType: LayoutType
  sizeMetricType: SizeMetricType
  renderCutOff: number
}) {
  const hiearchy = hierarchy<GitObject>(tree)
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
