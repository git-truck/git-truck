import type { GitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { MetricCache } from "./metrics"
import { removeFirstPart } from "~/util"
import { noEntryColor } from "~/const"

export function setDominantAuthorColor(
  authorColors: Map<string, `#${string}`>,
  blob: GitBlobObject,
  cache: MetricCache,
  dominantAuthorPerFile: Map<string, string>
) {
  const path = removeFirstPart(blob.path)
  const dominantAuthor = dominantAuthorPerFile.get(path)
  if (!dominantAuthor) {
    // console.warn("No dominant author for file", path)
    return
  }
  const legend = cache.legend as PointLegendData
  const color = authorColors.get(dominantAuthor) ?? noEntryColor

  cache.colormap.set(blob.path, color)

  if (legend.has(dominantAuthor)) {
    legend.get(dominantAuthor)?.add(1)
    return
  }
  legend.set(dominantAuthor, new PointInfo(color, 1))
}
