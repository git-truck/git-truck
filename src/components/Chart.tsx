import type { HierarchyCircularNode, HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy"
import { hierarchy, pack, treemap, treemapBinary } from "d3-hierarchy"
import type { MouseEventHandler } from "react"
import React, { useDeferredValue, memo, useEffect, useMemo, useRef, useState } from "react"
import type {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitObject,
  HydratedGitTreeObject
} from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useComponentSize } from "~/hooks"
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
  treemapTreeTextOffsetY
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

import * as THREE from "three"
import { Canvas, useFrame, ThreeElements, Object3DNode, extend } from "@react-three/fiber"
import { OrbitControls, OrthographicCamera } from '@react-three/drei'

import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import myFont from './Helvetiker.json'
import { useSearchParams } from "@remix-run/react"
extend({ TextGeometry })

declare module "@react-three/fiber" {
  interface ThreeElements {
    textGeometry: Object3DNode<TextGeometry, typeof TextGeometry>;
  }
}
const font = new FontLoader().parse(myFont);

type CircleOrRectHiearchyNode = HierarchyCircularNode<HydratedGitObject> | HierarchyRectangularNode<HydratedGitObject>

export const Chart = memo(function Chart({
  setHoveredObject
}: {
  setHoveredObject: (obj: HydratedGitObject | null) => void
}) {
  const [ref, rawSize] = useComponentSize()
  const { searchResults } = useSearch()
  const size = useDeferredValue(rawSize)
  const { analyzerData } = useData()
  const { chartType, sizeMetric, depthType, hierarchyType, labelsVisible, renderCutoff } = useOptions()
  const { path } = usePath()
  const { clickedObject, setClickedObject } = useClickedObject()
  const { setPath } = usePath()

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

  const commit = useMemo(() => {
    if (hierarchyType === "NESTED") return analyzerData.commit

    return {
      ...analyzerData.commit,
      tree: {
        ...analyzerData.commit.tree,
        children: flatten(analyzerData.commit.tree)
      }
    }
  }, [analyzerData.commit, hierarchyType])

  const nodes = useMemo(() => {
    if (size.width === 0 || size.height === 0) return []
    return createPartitionedHiearchy(commit, size, chartType, sizeMetric, path, renderCutoff).descendants()
  }, [size, commit, chartType, sizeMetric, path, renderCutoff])

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
            if (!isRoot) setHoveredObject(d.data as HydratedGitObject)
            else setHoveredObject(null)
          },
          onMouseOut: () => setHoveredObject(null)
        }
  }

  if (chartType.startsWith("R3F")) {
    return (
      <div className="relative grid place-items-center overflow-hidden" ref={ref}>
        <Canvas
          key={`${chartType}|${size.width}|${size.height}`}
          className={clsx("grid h-full w-full place-items-center", {
            "cursor-zoom-out": path.includes("/")
          })}
          style={{
            height: size.height,
            width: size.width,
          }}
          shadows={true}
        >
          {nodes.map((d, i) => {
            return (
              <Node
                key={d.data.path}
                d={d}
                isSearchMatch={Boolean(searchResults[d.data.path])}
                canvas_size={size}
              />
            )
          })}
          <ambientLight intensity={3} />
          <pointLight position={[1000, 1000, 1000]} intensity={1000000} />
          <OrthographicCamera
            makeDefault
            near={0}
            position={[0, 1000, 0]}
          />
          <OrbitControls target={[0, 0, 0]}/>
        </Canvas>
      </div>
    )
  } else {
    return (
      <div className="relative grid place-items-center overflow-hidden" ref={ref}>
        <svg
          key={`svg|${size.width}|${size.height}`}
          className={clsx("grid h-full w-full place-items-center", {
            "cursor-zoom-out": path.includes("/")
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
                    <Node key={d.data.path} d={d} isSearchMatch={Boolean(searchResults[d.data.path])} canvas_size={size} />
                    {labelsVisible && (
                      <NodeText key={`text|${path}|${d.data.path}|${chartType}|${sizeMetric}`} d={d}>
                        {collapseText({ d, isRoot: i === 0, path, displayText: d.data.name, chartType })}
                      </NodeText>
                    )}
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }
})

function Node({ d, isSearchMatch, canvas_size }: { d: CircleOrRectHiearchyNode; isSearchMatch: boolean, canvas_size: { width: number, height: number } }) {
  const [metricsData] = useMetrics()
  const { chartType, metricType, authorshipType, transitionsEnabled } = useOptions()

  const commonProps = useMemo(() => {
    let props: JSX.IntrinsicElements["rect"] = {
      stroke: isSearchMatch ? searchMatchColor : "transparent",
      strokeWidth: "1px",
      fill: isBlob(d.data)
        ? metricsData[authorshipType].get(metricType)?.colormap.get(d.data.path) ?? "grey"
        : "transparent"
    }

    if (chartType === "BUBBLE_CHART") {
      const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
      props = {
        ...props,
        x: circleDatum.x - circleDatum.r,
        y: circleDatum.y - circleDatum.r + estimatedLetterHeightForDirText - 1,
        width: circleDatum.r * 2,
        height: circleDatum.r * 2,
        rx: circleDatum.r,
        ry: circleDatum.r
      }
    } else if (chartType === "R3F") {
      const datum = d as HierarchyCircularNode<HydratedGitObject>
      props = {
        ...props,
        x: datum.x - canvas_size.width/2,
        y: datum.y - canvas_size.height/2,
        width: datum.r * 2,
        height: datum.r * 2,
        rx: datum.r,
        ry: datum.r
      }
    } else if (chartType === "R3F2") {
      const datum = d as HierarchyRectangularNode<HydratedGitObject>

      props = {
        ...props,
        x: datum.x0 + (datum.x1 - datum.x0)/2 - canvas_size.width/2,
        y: datum.y0 + (datum.y1 - datum.y0)/2 - canvas_size.height/2,
        width: datum.x1 - datum.x0,
        height: datum.y1 - datum.y0,
        rx: treemapNodeBorderRadius,
        ry: treemapNodeBorderRadius
      }
    } else {
      const datum = d as HierarchyRectangularNode<HydratedGitObject>

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
  }, [isSearchMatch, d, metricsData, authorshipType, metricType, chartType, canvas_size])

  const [searchParams, setSearchParams] = useSearchParams()
  // /repository/branch?normal
  const normalMesh = searchParams.get("normal") !== null

  if (chartType === "R3F") {
    if (normalMesh) {
      return <>
        <mesh
          position={[
            commonProps.x as number,
            d.depth * 100,
            commonProps.y as number,
          ]}
          scale={[
            commonProps.rx as number,
            100,
            commonProps.rx as number,
          ]}
          rotation={[0, 0, 0]}
        >
          <cylinderGeometry />
          <meshNormalMaterial />
        </mesh>
      </>
    } else {
      return <>
        <mesh
          position={[
            commonProps.x as number,
            d.depth * 100,
            commonProps.y as number,
          ]}
          scale={[
            commonProps.rx as number,
            100,
            commonProps.rx as number,
          ]}
          rotation={[0, 0, 0]}
        >
          <cylinderGeometry />
          {
            (isTree(d.data))
              ? <meshBasicMaterial color={"black"} />
              : <meshLambertMaterial color={commonProps.fill}/>
          }
        </mesh>
        {
          (isTree(d.data))
          ? <mesh
              position={[
                commonProps.x as number,
                d.depth * 100 + 1,
                commonProps.y as number,
              ]}
              scale={[
                (commonProps.rx as number) - 1,
                100,
                (commonProps.rx as number) - 1,
              ]}
              rotation={[0, 0, 0]}
            >
              <cylinderGeometry />
              <meshBasicMaterial color={"white"} toneMapped={false} />
            </mesh>
          : null
        }
      </>
    }
  } else if(chartType === "R3F2") {
    const textIsTooLong = (text: string) => (commonProps.width as number)< text.length * estimatedLetterWidth
    if (normalMesh) {
      return <mesh
        position={[
          commonProps.x as number,
          d.depth * 100,
          commonProps.y as number,
        ]}
        scale={[
          commonProps.width as number,
          100,
          commonProps.height as number,
        ]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
    } else {
      return <>
        {
          (!textIsTooLong(d.data.name))
            ? <mesh
              position={[
                (commonProps.x as number)-(commonProps.width as number)/2+5,
                d.depth * 100 + 100,
                (commonProps.y as number)-(commonProps.height as number)/2+15,
              ]}
              rotation={[
                -3.14/2,
                0,
                0,
              ]}
            >
              <meshBasicMaterial toneMapped={false} attach='material' color={'black'}/>
              <textGeometry args={[d.data.name, {font, size:10, height: 1}]}/>
            </mesh>
            : null
        }
        <mesh
          position={[
            commonProps.x as number,
            d.depth * 100,
            commonProps.y as number,
          ]}
          scale={[
            commonProps.width as number,
            100,
            commonProps.height as number,
          ]}
          rotation={[0, 0, 0]}
        >
          <boxGeometry />
          {
            (isTree(d.data))
              ? <meshBasicMaterial color={"black"} toneMapped={false} />
              : <meshBasicMaterial color={commonProps.fill}/>
          }
        </mesh>
        {
          (isTree(d.data))
            ? <mesh
                position={[
                  commonProps.x as number,
                  d.depth * 100 + 1,
                  commonProps.y as number,
                ]}
                scale={[
                  (commonProps.width as number) - 1,
                  100,
                  (commonProps.height as number) - 1,
                ]}
                rotation={[0, 0, 0]}
              >
                <boxGeometry />
                <meshBasicMaterial color={"white"} toneMapped={false} />
              </mesh>
            : null
        }
      </>
    }
  } else {
    return (
      <rect
        {...commonProps}
        className={clsx({
          "cursor-pointer": isBlob(d.data),
          "transition-all duration-500 ease-in-out": transitionsEnabled,
          "animate-stroke-pulse": isSearchMatch,
          "stroke-black/20": isTree(d.data)
        })}
      />
    )
  }
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
    const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
    textIsTooLong = (text: string) => circleDatum.r < 50 || circleDatum.r * Math.PI < text.length * estimatedLetterWidth
    textIsTooTall = () => false
  } else {
    const datum = d as HierarchyRectangularNode<HydratedGitObject>
    textIsTooLong = (text: string) => datum.x1 - datum.x0 < text.length * estimatedLetterWidth
    textIsTooTall = (text: string) => {
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

function NodeText({ d, children = null }: { d: CircleOrRectHiearchyNode; children?: React.ReactNode }) {
  const [metricsData] = useMetrics()
  const { authorshipType, metricType } = useOptions()
  const isBubbleChart = isCircularNode(d)

  if (children === null) return null

  let textPathData: string

  if (isBubbleChart) {
    const yOffset = isTree(d.data) ? circleTreeTextOffsetY : circleBlobTextOffsetY
    const circleDatum = d as HierarchyCircularNode<HydratedGitObject>
    textPathData = circlePathFromCircle(circleDatum.x, circleDatum.y + yOffset, circleDatum.r)
  } else {
    const datum = d as HierarchyRectangularNode<HydratedGitObject>
    textPathData = roundedRectPathFromRect(
      datum.x0 + (isTree(d.data) ? treemapTreeTextOffsetX : treemapBlobTextOffsetX),
      datum.y0 + (isTree(d.data) ? treemapTreeTextOffsetY : treemapBlobTextOffsetY),
      datum.x1 - datum.x0,
      datum.y1 - datum.y0,
      0
    )
  }

  const fillColor = isBlob(d.data)
    ? getTextColorFromBackground(metricsData[authorshipType].get(metricType)?.colormap.get(d.data.path) ?? "#333")
    : "#333"

  const textPathBaseProps = {
    startOffset: isBubbleChart ? "50%" : undefined,
    dominantBaseline: isBubbleChart ? (isTree(d.data) ? "central" : "hanging") : "hanging",
    textAnchor: isBubbleChart ? "middle" : "start",
    href: `#path-${d.data.path}`
  }

  return (
    <>
      <path d={textPathData} id={`path-${d.data.path}`} className="hidden" />
      {isTree(d.data) ? (
        <text
          className={clsx("pointer-events-none fill-none stroke-[7px] font-mono text-sm font-bold", {
            "stroke-white": isBubbleChart
          })}
          strokeLinecap="round"
        >
          <textPath {...textPathBaseProps}>{children}</textPath>
        </text>
      ) : null}
      <text fill={fillColor} className="pointer-events-none">
        <textPath
          {...textPathBaseProps}
          className={clsx("font-mono", {
            "text-sm font-bold": isTree(d.data),
            "text-xs": !isTree(d.data)
          })}
        >
          {children}
        </textPath>
      </text>
    </>
  )
}

function isCircularNode(d: CircleOrRectHiearchyNode) {
  return typeof (d as HierarchyCircularNode<HydratedGitObject>).r === "number"
}

function createPartitionedHiearchy(
  data: HydratedGitCommitObject,
  size: { height: number; width: number },
  chartType: ChartType,
  sizeMetricType: SizeMetricType,
  path: string,
  renderCutoff: number
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

  const hiearchy = hierarchy(castedTree).sum((d) => {
    const hydratedBlob = d as HydratedGitBlobObject
    switch (sizeMetricType) {
      case "FILE_SIZE":
        return hydratedBlob.sizeInBytes ?? 1
      case "MOST_COMMITS":
        return hydratedBlob.noCommits
      case "EQUAL_SIZE":
        return 1
      case "LAST_CHANGED":
        return (hydratedBlob.lastChangeEpoch ?? data.oldestLatestChangeEpoch) - data.oldestLatestChangeEpoch
      case "TRUCK_FACTOR":
        return Object.keys(hydratedBlob.authors ?? {}).length
    }
  })
  const cutOff = Number.isNaN(renderCutoff) ? 2 : renderCutoff
  switch (chartType) {
    case "R3F2":
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
        return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
      })

      return tmPartition

    case "R3F":
    case "BUBBLE_CHART":
      const bubbleChartPartition = pack<HydratedGitObject>()
        .size([size.width, size.height - estimatedLetterHeightForDirText])
        .padding(bubblePadding)
      const bPartition = bubbleChartPartition(hiearchy)
      filterTree(bPartition, (child) => {
        const cast = child as HierarchyCircularNode<HydratedGitObject>
        return cast.r >= cutOff
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

function flatten(tree: HydratedGitTreeObject) {
  const flattened: HydratedGitBlobObject[] = []
  for (const child of tree.children) {
    if (child.type === "blob") {
      flattened.push(child)
    } else {
      flattened.push(...flatten(child))
    }
  }
  return flattened
}
