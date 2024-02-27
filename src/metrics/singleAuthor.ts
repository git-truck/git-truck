import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { MetricCache } from "./metrics"
import { removeFirstPart } from "~/util"

export function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache, authorColors: Map<string, `#${string}`>, dominantAuthorPerFile: Map<string, string>, authorCountsPerFile: Map<string, number>) {
  const multipleAuthorsColor = "#e0e0e0"
  const noAuthorsColor = "#404040"
  const path = removeFirstPart(blob.path)
  const dominantAuthor = dominantAuthorPerFile.get(path)
  const legend = cache.legend as PointLegendData

  const authorCount = authorCountsPerFile.get(path)
  
  switch (authorCount) {
    case undefined:
    case 0:
      legend.set("No authors", new PointInfo(noAuthorsColor, 0))
      cache.colormap.set(blob.path, noAuthorsColor)
      return
      case 1:
      const color = authorColors.get(dominantAuthor ?? "") ?? noAuthorsColor
      legend.set(dominantAuthor ?? "", new PointInfo(color, 2))
      cache.colormap.set(blob.path, color)
      return
    default:
      legend.set("Multiple authors", new PointInfo(multipleAuthorsColor, 1))
      cache.colormap.set(blob.path, multipleAuthorsColor)
  }
}
