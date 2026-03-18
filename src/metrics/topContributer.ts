import type { GitBlobObject } from "~/shared/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { MetricCache } from "~/metrics/metrics"
import { MULTIPLE_CONTRIBUTORS, noEntryColor } from "~/const"

export function setTopContributorColor(
  contributorColors: Record<string, `#${string}`>,
  blob: GitBlobObject,
  cache: MetricCache,
  topContributorPerFile: Record<string, { contributor: string; contribcount: number }>,
  topContributorCutoff: number,
  contribSumPerFile: Record<string, number>
) {
  const dominantAuthor = topContributorPerFile[blob.path]
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
  if (authorPercentage < topContributorCutoff) {
    bumpMultiple()
    return
  }

  const color = contributorColors[dominantAuthor.contributor] ?? noEntryColor
  cache.colormap.set(blob.path, color)

  if (legend.has(dominantAuthor.contributor)) {
    legend.get(dominantAuthor.contributor)?.add(1)
    return
  }
  legend.set(dominantAuthor.contributor, new PointInfo(color, 1))
}
