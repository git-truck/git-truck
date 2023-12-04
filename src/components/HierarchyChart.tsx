import * as pixi from "pixi.js"
import { Graphics, Text } from "@pixi/react-animated"
import { Stage } from "@pixi/react"
import { Spring } from "react-spring"
import type { HierarchyCircularNode, HierarchyRectangularNode } from "d3-hierarchy"
import type { HydratedGitObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useCallback } from "react"
import { usePath } from "~/contexts/PathContext"
import { useMetrics } from "~/contexts/MetricContext"
import { type ChartType, useOptions } from "~/contexts/OptionsContext"
import { adjustColorBrightness } from "~/util"

function Node(props: {
  node: HierarchyRectangularNode<HydratedGitObject> | HierarchyCircularNode<HydratedGitObject>
  setClickedObject: (clicked: HydratedGitObject) => void
  setPath: (path: string) => void
  colorMap: Map<string, `#${string}`> | undefined
  type: ChartType
  transitions: boolean
  isClicked: boolean
  showText: boolean
}) {
  const draw = useCallback(
    (g: pixi.Graphics) => {
      g.clear()
      if (props.node.data.type === "blob") {
        g.beginFill(0xffffff)
      } else {
        g.lineStyle(0.5, 0xaaaaaa, 0.5)
      }
      // g.interactive = true
      g.eventMode= "dynamic"
      if (props.type === "TREE_MAP") {
        const node = props.node as HierarchyRectangularNode<HydratedGitObject>
        // g.drawRect(0, 0, node.x1 - node.x0, node.y1 - node.y0)
        g.drawRoundedRect(0, 0, Math.round(node.x1 - node.x0), Math.round(node.y1 - node.y0), 8)
        g.hitArea = new pixi.Rectangle(0, 0, node.x1 - node.x0, node.y1 - node.y0)
      } else {
        const node = props.node as HierarchyCircularNode<HydratedGitObject>
        g.drawCircle(0, 0, Math.round(node.r)) // Use x and y from springProps
        g.hitArea = new pixi.Circle(0, 0, node.r)
      }
      g.on("click", () => {
        props.setClickedObject(props.node.data)
        if (props.node.data.type === "tree") props.setPath(props.node.data.path)
      })
      g.cursor = "pointer"
      if (props.node.data.type === "blob") g.endFill()
    },
    [props]
  )

  const to = { x: 0, y: 0, tint: props.colorMap?.get(props.node.data.path) ?? "#444444" }
  if (props.type === "TREE_MAP") {
    const node = props.node as HierarchyRectangularNode<HydratedGitObject>
    to.x = Math.round(node.x0)
    to.y = Math.round(node.y0)
  } else {
    const node = props.node as HierarchyCircularNode<HydratedGitObject>
    to.x = Math.round(node.x)
    to.y = Math.round(node.y)
  }

  if (props.isClicked) to.tint = adjustColorBrightness(to.tint, 0.5)

  return (
    <Spring to={to} config={{ duration: props.transitions ? 300 : 0 }}>
      {(springProps) => (
        <>
          <Graphics draw={draw} {...springProps} />
          {props.showText
            ? <Text text={props.node.data.name} {...springProps} style={new pixi.TextStyle({ fontSize: 10, align: "center" })} />
            : null
          }
        </>
      )}
    </Spring>
  )
}

export default function HierarchyChart(props: {
  nodes: HierarchyRectangularNode<HydratedGitObject>[] | HierarchyCircularNode<HydratedGitObject>[]
  size: { width: number; height: number }
}) {
  const { clickedObject, setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const [metricsData] = useMetrics()
  const { chartType, metricType, authorshipType, transitionsEnabled, labelsVisible } = useOptions()
  const colorMap = metricsData[authorshipType].get(metricType)?.colormap  

  return (
    <Stage {...props.size} options={{ backgroundAlpha: 0, antialias: true }}>
      {props.nodes.map((node) => {
        return (
          <Node
            key={node.data.path}
            node={node}
            setClickedObject={setClickedObject}
            setPath={setPath}
            colorMap={colorMap}
            type={chartType}
            transitions={transitionsEnabled}
            isClicked={clickedObject?.path === node.data.path}
            showText={labelsVisible}
          />
        )
      })}
    </Stage>
  )
}
