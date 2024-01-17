import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { AuthorshipType, MetricCache } from "./metrics"

export function setDominanceColor(
  blob: HydratedGitBlobObject,
  cache: MetricCache,
  authorshipType: AuthorshipType,
  authorColors: Map<string, `#${string}`>
) {
  const multipleAuthorsColor = "#e0e0e0"
  const noAuthorsColor = "#404040"

  const authorUnion = blob.unionedAuthors?.[authorshipType] ?? {}

  const legend = cache.legend as PointLegendData
  const authors = Object.keys(authorUnion)
  switch (authors.length) {
    case 0:
      legend.set("No authors", new PointInfo(noAuthorsColor, 0))
      cache.colormap.set(blob.path, noAuthorsColor)
      return
    case 1: {
      const color = authorColors.get(authors[0]) ?? noAuthorsColor
      legend.set(authors[0], new PointInfo(color, 2))
      cache.colormap.set(blob.path, color)
      return
    }
    default:
      legend.set("Multiple authors", new PointInfo(multipleAuthorsColor, 1))
      cache.colormap.set(blob.path, multipleAuthorsColor)
  }
}
