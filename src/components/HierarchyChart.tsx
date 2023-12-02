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

function RectangleNode(props: {
  node: HierarchyRectangularNode<HydratedGitObject> | HierarchyCircularNode<HydratedGitObject>
  setClickedObject: (clicked: HydratedGitObject) => void
  setPath: (path: string) => void
  colorMap: Map<string, `#${string}`> | undefined
  type: ChartType
  transitions: boolean
}) {
  const draw = useCallback(
    (g: pixi.Graphics) => {
      g.clear()
      if (props.node.data.type === "blob") {
        g.beginFill(0xffffff)
      } else {
        g.lineStyle(1, 0x444444, 1)
      }
      g.interactive = true
      if (props.type === "TREE_MAP") {
        const node = props.node as HierarchyRectangularNode<HydratedGitObject>
        g.drawRect(0, 0, node.x1 - node.x0, node.y1 - node.y0)
        g.hitArea = new pixi.Rectangle(0, 0, node.x1 - node.x0, node.y1 - node.y0)
      } else {
        const node = props.node as HierarchyCircularNode<HydratedGitObject>
        g.drawCircle(0, 0, node.r) // Use x and y from springProps
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
    to.x = node.x0
    to.y = node.y0
  } else {
    const node = props.node as HierarchyCircularNode<HydratedGitObject>
    to.x = node.x
    to.y = node.y
  }

  return (
    <Spring to={to} config={{ duration: props.transitions ? 3000 : 0 }}>
      {(springProps) => (
        <>
          <Graphics draw={draw} {...springProps} />
          {/* <Text
            text={props.node.data.name}
            {...springProps}
            style={new pixi.TextStyle({ fontSize: 10, align: "center" })}
          /> */}
        </>
      )}
    </Spring>
  )
}

export default function TreeMap(props: {
  nodes: HierarchyRectangularNode<HydratedGitObject>[] | HierarchyCircularNode<HydratedGitObject>[]
  size: { width: number; height: number }
}) {
  const { setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const [metricsData] = useMetrics()
  const { chartType, metricType, authorshipType, transitionsEnabled } = useOptions()
  const colorMap = metricsData[authorshipType].get(metricType)?.colormap

  return (
    <Stage {...props.size} options={{ backgroundAlpha: 0, antialias: true }}>
      {props.nodes.map((node) => {
        return (
          <RectangleNode
            key={node.data.path}
            node={node}
            setClickedObject={setClickedObject}
            setPath={setPath}
            colorMap={colorMap}
            type={chartType}
            transitions={transitionsEnabled}
          />
        )
      })}
    </Stage>
  )
}
