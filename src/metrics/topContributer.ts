import type { GitBlobObject } from "~/shared/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { MetricCache } from "~/metrics/metrics"
import { MULTIPLE_CONTRIBUTORS, noEntryColor } from "~/const"

export function setDominantAuthorColor(
  authorColors: Record<string, `#${string}`>,
  blob: GitBlobObject,
  cache: MetricCache,
  dominantAuthorPerFile: Record<string, { author: string; contribcount: number }>,
  dominantAuthorCutoff: number,
  contribSumPerFile: Record<string, number>
) {
  const dominantAuthor = dominantAuthorPerFile[blob.path]
  const contribSum = contribSumPerFile[blob.path]
  const legend = cache.legend as PointLegendData

  // helper to bump multiple-contributors count
  const bumpMultiple = () => {
    if (legend.has(MULTIPLE_CONTRIBUTORS)) {
      legend.get(MULTIPLE_CONTRIBUTORS)?.add(1)
    } else {
      legend.set(MULTIPLE_CONTRIBUTORS, new PointInfo(noEntryColor, 1))
    }
    cache.colormap.set(blob.path, noEntryColor)
  }

  if (!dominantAuthor || !contribSum) {
    bumpMultiple()
    return
  }

  const authorPercentage = (dominantAuthor.contribcount / contribSum) * 100
  if (authorPercentage < dominantAuthorCutoff) {
    bumpMultiple()
    return
  }

  const color = authorColors[dominantAuthor.author] ?? noEntryColor
  cache.colormap.set(blob.path, color)

  if (legend.has(dominantAuthor.author)) {
    legend.get(dominantAuthor.author)?.add(1)
    return
  }
  legend.set(dominantAuthor.author, new PointInfo(color, 1))
}
