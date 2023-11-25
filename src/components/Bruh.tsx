import * as pixi from 'pixi.js';
import { Stage, Graphics, Text } from '@pixi/react';
import { Fragment } from 'react';
import type { HierarchyCircularNode, HierarchyRectangularNode } from "d3-hierarchy"
import type { HydratedGitObject } from '~/analyzer/model';

export function Bruh(props: {nodes: HierarchyRectangularNode<HydratedGitObject>[] | HierarchyCircularNode<HydratedGitObject>[]}) {

  const art = (g: pixi.Graphics, node: HierarchyRectangularNode<HydratedGitObject> | HierarchyCircularNode<HydratedGitObject>) => {
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
    g.addEventListener("mouseover", (e) => console.log("hover", node.data.path))
    console.log("draw", node.data.path)
  }

  return (
    <Stage width={600} height={800} options={{ backgroundColor: 0xffffff, antialias: true }}>
        {props.nodes.map((node) => {
            const circleDatum = node as HierarchyCircularNode<HydratedGitObject>
            return (
                <Fragment key={node.data.path}>
                    <Graphics draw={(g) => art(g, node)} />
                    <Text text={node.data.name} x={circleDatum.x} y={circleDatum.y} style={new pixi.TextStyle({fontSize: 10, align: "center"})} />
                </Fragment>
            )
        })}
    </Stage>
  );
}
