import type * as pixi from 'pixi.js';
import { Stage, Graphics } from '@pixi/react';
import { useCallback } from 'react';
import type { HierarchyCircularNode, HierarchyRectangularNode } from "d3-hierarchy"
import type { HydratedGitObject } from '~/analyzer/model';

export function Bruh(props: {nodes: HierarchyRectangularNode<HydratedGitObject>[] | HierarchyCircularNode<HydratedGitObject>[]}) {

  const art = useCallback<(g: pixi.Graphics) => void>((g) => {
    g.clear();
    // g.addEventListener("click", () => console.log("hej"))
    
    for (const node of props.nodes) {
        const circleDatum = node as HierarchyCircularNode<HydratedGitObject>
        if (circleDatum.data.type === "blob") {
            g.beginFill(0xffff0b, 0.5);
        }
        
        g.lineStyle(2, 0xff00ff, 1);
        g.drawCircle(circleDatum.x, circleDatum.y, circleDatum.r);
        if (circleDatum.data.type === "blob") g.endFill();
    }
  }, [props.nodes])

  return (
    <Stage width={600} height={600} options={{ backgroundColor: 0xffffff }}>
      <Graphics draw={art} />
    </Stage>
  );
}
