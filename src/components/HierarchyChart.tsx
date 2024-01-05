import * as pixi from "pixi.js"
import { Graphics, Text } from "@pixi/react-animated"
import { Stage, useTick } from "@pixi/react"
import { Spring, type SpringValue } from "react-spring"
import type { HierarchyCircularNode, HierarchyRectangularNode } from "d3-hierarchy"
import type { HydratedGitObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useCallback, useState } from "react"
import { usePath } from "~/contexts/PathContext"
import { useMetrics } from "~/contexts/MetricContext"
import { type ChartType, useOptions } from "~/contexts/OptionsContext"
import { brighten } from "~/util"
import { flushSync } from "react-dom"

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
  // This is not used, it is only there to force reactspring to update springprops
  const [, setEndState] = useState({ bruh: "" })
  useTick(() => {
    setEndState({
      bruh: ""
    })
  })

  const draw = useCallback(
    (
      g: pixi.Graphics,
      springProps: {
        width: SpringValue<number>
        height: SpringValue<number>
      }
    ) => {
      g.clear()
      if (props.node.data.type === "blob") {
        g.beginFill(0xffffff)
      } else {
        g.lineStyle(0.5, 0xaaaaaa, 0.5)
      }
      if (props.type === "TREE_MAP") {
        g.drawRoundedRect(0, 0, springProps.width.get(), springProps.height.get(), 8)
        g.hitArea = new pixi.Rectangle(0, 0, springProps.width.get(), springProps.height.get())
      } else {
        g.drawCircle(0, 0, springProps.width.get())
        g.hitArea = new pixi.Circle(0, 0, springProps.width.get())
      }
      if (props.node.data.type === "blob") g.endFill()
    },
    [props]
  )

  const to = { x: 0, y: 0, tint: props.colorMap?.get(props.node.data.path) ?? "#444444", width: 1, height: 1 }
  if (props.type === "TREE_MAP") {
    const node = props.node as HierarchyRectangularNode<HydratedGitObject>
    to.x = Math.round(node.x0)
    to.y = Math.round(node.y0)
    to.width = node.x1 - node.x0
    to.height = node.y1 - node.y0
  } else {
    const node = props.node as HierarchyCircularNode<HydratedGitObject>
    to.x = Math.round(node.x)
    to.y = Math.round(node.y)
    to.width = node.r
    to.height = node.r
  }

  if (props.isClicked) to.tint = brighten(to.tint)

  return (
    <Spring to={to} config={{ duration: props.transitions ? 300 : 0 }}>
      {(springProps) => (
        <>
          <Graphics
            eventMode={"dynamic"}
            draw={(g) => draw(g, springProps)}
            x={springProps.x}
            y={springProps.y}
            tint={springProps.tint}
            onclick={() => {
              props.setClickedObject(props.node.data)
              if (props.node.data.type === "tree") props.setPath(props.node.data.path)
            }}
            cursor={"pointer"}
          />
          {props.showText ? (
            <Text
              text={props.node.data.name}
              {...springProps}
              style={new pixi.TextStyle({ fontSize: 10, align: "center" })}
            />
          ) : null}
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
