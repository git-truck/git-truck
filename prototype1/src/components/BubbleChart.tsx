import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowSize } from "react-use";
import {
  GitObject,
  HydratedGitBlobObject,
  HydratedGitCommitObject
} from "../../../parser/src/model";
import { hierarchy, pack, select, Selection } from "d3";
import {
  ColdMapTranslater,
  HeatMapTranslater,
  getDominanceColor,
  getExtensionColor
} from "../colors";
import { Metric } from "../metrics";
import { padding, textSpacingFromCircle } from "../const";
import { unionAuthors } from "../util";

interface BubbleChartProps {
  data: HydratedGitCommitObject;
  metric: Metric;
}
export function BubbleChart(props: BubbleChartProps) {
  const [currentBlob, setCurrentBlob] = useState<HydratedGitBlobObject | null>(
    null
  );

  const heatMapTranslater = useMemo<HeatMapTranslater>(
    () => new HeatMapTranslater(props.data.minNoCommits, props.data.maxNoCommits),
    [props.data.minNoCommits, props.data.maxNoCommits]
  );
  const coldMapTranslater = useMemo<ColdMapTranslater>(
    () => new ColdMapTranslater(props.data.minNoCommits, props.data.maxNoCommits),
    [props.data.minNoCommits, props.data.maxNoCommits]
  );

  let legendRef = useRef<HTMLDivElement>(null);
  let svgRef = useRef<SVGSVGElement>(null);
  let sizeProps = useWindowSize(0, 0);
  let paddedSizeProps = {
    height: sizeProps.height - padding * 2,
    width: sizeProps.width - padding * 2,
  };

  function clickHandler(e: MouseEvent) {
    //@ts-ignore
    let data = e.target["__data__"].data;
    if (data && data.type === "blob") {
      setCurrentBlob(data);
    }
  }

  function drawBubbleChart(
    data: HydratedGitCommitObject,
    paddedSizeProps: { height: number; width: number; },
    root: Selection<SVGGElement, unknown, null, undefined>,
    metric: Metric
  ) {
    let castedTree = data.tree as GitObject;
    let hiearchy = hierarchy(castedTree)
      .sum((d) => (d as HydratedGitBlobObject).noLines)
      .sort((a, b) => b.value !== undefined && a.value !== undefined ? b.value - a.value : 0
      );

    let partition = pack<GitObject>()
      .size([paddedSizeProps.width, paddedSizeProps.height])
      .padding(padding);

    let partitionedHiearchy = partition(hiearchy);

    const group = root
      .selectAll("circle.node")
      .data(partitionedHiearchy)
      .enter()
      .append("g")
      .classed("entry", true);

    const circle = group.append("circle");

    function getColorOfBlobDepedentOnMetricAdapter(
      blob: HydratedGitBlobObject,
      metric: Metric
    ): string {
      switch (metric) {
        case Metric.Dominated:
          return getDominanceColor(blob);
        case Metric.FileExtension:
          return getExtensionColor(blob);
        case Metric.HeatMap:
          return heatMapTranslater.getColor(blob);
        case Metric.ColdMap:
          return coldMapTranslater.getColor(blob);
        default:
          throw new Error(`Metric option is invalid: ${metric}`);
      }
    }

    circle
      .classed("node", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .style("fill", (d) => {
        return d.data.type === "blob"
          ? getColorOfBlobDepedentOnMetricAdapter(
            d.data as HydratedGitBlobObject,
            metric
          )
          : "none";
      })
      .enter();

    const path = group.append("path");

    path
      .attr("d", (d) => circlePathFromCircle(d.x, d.y, d.r + textSpacingFromCircle)
      )
      .classed("name-path", true)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("id", (d) => d.data.path);

    if (new URL(window.location.toString()).searchParams.get("debug") === "true") {
      path.classed("name-path debug", true);
    }

    const text = group.append("text");

    text
      .append("textPath")
      .attr("startOffset", "50%")
      .attr("dominant-baseline", "bottom")
      .attr("text-anchor", "middle")
      .attr("xlink:href", (d) => `#${d.data.path}`)
      .text((d) => d.data.name)
      .style("font-size", "0.8em")
      .style("font-weight", (d) => (d.data.type === "tree" ? "bold" : "normal"));
  }

  useEffect(() => {
    let svg = select(svgRef.current);
    const root = svg.append("g");

    drawBubbleChart(props.data, paddedSizeProps, root, props.metric);

    let node = root.node();
    if (node)
      node.addEventListener("click", clickHandler);

    return () => {
      if (node)
        node.removeEventListener("click", clickHandler);
      root.remove();
    };
  }, [paddedSizeProps, props.metric]);

  return (
    <div className="container">
      <svg
        className="visualization"
        {...paddedSizeProps}
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${paddedSizeProps.width} ${paddedSizeProps.height}`} />
      {currentBlob !== null ? (
        <div ref={legendRef} className="file-details box">
          <b style={{ fontSize: "1.5rem" }}>{currentBlob.name}</b>
          <div>Number of lines: {currentBlob.noLines}</div>
          <div>Author distribution:</div>
          <br />
          {Object.entries(makePercentResponsibilityDistribution(currentBlob))
            .sort((a, b) => (a[1] < b[1] ? 1 : -1))
            .map(([author, contrib]) => (
              <div key={`${author}${contrib}`}>
                <b>{author}:</b> {(contrib * 100).toFixed(2)}%
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
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
          a${r},${r} 0 1,1 0,${r * 2}`;
}

function makePercentResponsibilityDistribution(
  d: HydratedGitBlobObject
): Record<string, number> {
  const unionedAuthors = unionAuthors(d);
  const sum = Object.values(unionedAuthors).reduce((acc, v) => acc + v, 0);

  const newAuthorsEntries = Object.entries(unionedAuthors).reduce(
    (newAuthorOject, [author, contrib]) => {
      const fraction: number = contrib / sum;
      return { ...newAuthorOject, [author]: fraction };
    },
    {}
  );

  return newAuthorsEntries;
}
