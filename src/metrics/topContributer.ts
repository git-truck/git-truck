import type { GitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { MetricCache } from "./metrics"
import { noEntryColor } from "~/const"

export function setDominantAuthorColor(
  authorColors: Map<string, `#${string}`>,
  blob: GitBlobObject,
  cache: MetricCache,
  dominantAuthorPerFile: Map<string, { author: string, contribcount: number }>,
  dominantAuthorCutoff: number,
  contribSumPerFile: Map<string, number>
) {
  const dominantAuthor = dominantAuthorPerFile.get(blob.path)
  const contribSum = contribSumPerFile.get(blob.path)
  if (!dominantAuthor || !contribSum) {
    // console.warn("No dominant author for file", path)
    return
  }
  const legend = cache.legend as PointLegendData

  const authorPercentage = (dominantAuthor.contribcount / contribSum) * 100
  if (authorPercentage < dominantAuthorCutoff) {
    cache.colormap.set(blob.path, noEntryColor)
    return
  }
  const color = authorColors.get(dominantAuthor.author) ?? noEntryColor

  cache.colormap.set(blob.path, color)

  if (legend.has(dominantAuthor.author)) {
    legend.get(dominantAuthor.author)?.add(1)
    return
  }
  legend.set(dominantAuthor.author, new PointInfo(color, 1))
}
