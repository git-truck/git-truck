import * as pixi from 'pixi.js';
import { Stage, Graphics, Text } from '@pixi/react';
import { Spring } from 'react-spring';
import type { HierarchyCircularNode, HierarchyRectangularNode } from "d3-hierarchy"
import type { HydratedGitObject } from '~/analyzer/model';
import { useClickedObject } from '~/contexts/ClickedContext';

function CircleNode(props: {node: HierarchyCircularNode<HydratedGitObject>, setClickedObject: (clicked: HydratedGitObject) => void}) {
  const draw = (g: pixi.Graphics, node: HierarchyCircularNode<HydratedGitObject>) => {
    g.clear();
    const circleDatum = node as HierarchyCircularNode<HydratedGitObject>
    if (circleDatum.data.type === "blob") {
        g.beginFill(0x5555ff, 0.5);
    } else {
        g.lineStyle(1, 0x444444, 1);
    }
    g.drawCircle(circleDatum.x, circleDatum.y, circleDatum.r);
    if (circleDatum.data.type === "blob") g.endFill();
    g.interactive = true
    g.hitArea = new pixi.Circle(circleDatum.x, circleDatum.y, circleDatum.r)
    g.addEventListener("click", (e) => {
      props.setClickedObject(node.data)
      console.log("hover", node.data.path)
    })
    console.log("draw", node.data.path)
  }
  return (
    <>
      <Graphics draw={(g) => draw(g, props.node)} />
      <Text text={props.node.data.name} x={props.node.x} y={props.node.y} style={new pixi.TextStyle({fontSize: 10, align: "center"})} />
    </>
  )
}

export function Bruh(props: {nodes: HierarchyRectangularNode<HydratedGitObject>[] | HierarchyCircularNode<HydratedGitObject>[]}) {
  const { setClickedObject } = useClickedObject()

  return (
    <Stage width={600} height={800} options={{ backgroundColor: 0xffffff, antialias: true }}>
      {props.nodes.map((node) => {
        const circleDatum = node as HierarchyCircularNode<HydratedGitObject>
        return <CircleNode key={node.data.path} node={circleDatum} setClickedObject={setClickedObject}/> 
      })}
    </Stage>
  );
}
