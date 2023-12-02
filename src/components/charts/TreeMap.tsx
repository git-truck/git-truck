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
import { useOptions } from "~/contexts/OptionsContext"

function RectangleNode(props: {
  node: HierarchyRectangularNode<HydratedGitObject>
  setClickedObject: (clicked: HydratedGitObject) => void
  setPath: (path: string) => void
  colorMap: Map<string, `#${string}`> | undefined
}) {
  const draw = useCallback(
    (g: pixi.Graphics, node: HierarchyRectangularNode<HydratedGitObject>) => {
      g.clear()
      if (props.node.data.type === "blob") {
        g.beginFill(0xffffff)
      } else {
        g.lineStyle(1, 0x444444, 1)
      }
      g.drawRect(0, 0, props.node.x1 - props.node.x0, props.node.y1 - props.node.y0)
      g.interactive = true
      g.hitArea = new pixi.Rectangle(0, 0, props.node.x1 - props.node.x0, props.node.y1 - props.node.y0)
      g.on("click", () => {
        props.setClickedObject(node.data)
        if (node.data.type === "tree") props.setPath(node.data.path)
      })
      g.cursor = "pointer"
      if (props.node.data.type === "blob") g.endFill()
    },
    [props]
  )

  return (
    <Spring
      to={{ x: props.node.x0, y: props.node.y0, tint: props.colorMap?.get(props.node.data.path) ?? "#444444" }}
      config={{ mass: 10, tension: 1000, friction: 100 }}
    >
      {(springProps) => (
        <>
          <Graphics draw={(g) => draw(g, props.node)} {...springProps} />
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
}) {
  const { setClickedObject } = useClickedObject()
  const { setPath } = usePath()
  const [metricsData] = useMetrics()
  const { chartType, metricType, authorshipType, transitionsEnabled } = useOptions()
  const colorMap = metricsData[authorshipType].get(metricType)?.colormap

  return (
    <Stage width={1000} height={800} options={{ backgroundAlpha: 0, antialias: true }}>
      {props.nodes.map((node) => {
        const rectDatum = node as HierarchyRectangularNode<HydratedGitObject>
        return (
          <RectangleNode
            key={node.data.path}
            node={rectDatum}
            setClickedObject={setClickedObject}
            setPath={setPath}
            colorMap={colorMap}
          />
        )
      })}
    </Stage>
  )
}
