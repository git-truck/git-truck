import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { AuthorshipType, MetricCache } from "./metrics"

export function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache, authorshipType: AuthorshipType) {
  const dominatedColor = "#b91c1c"
  const defaultColor = "#fecaca"
  const nocreditColor = "#14b8a6"

  const authorUnion = blob.unionedAuthors?.[authorshipType] ?? {}

  let creditsum = 0
  for (const [, val] of Object.entries(authorUnion)) {
    creditsum += val
  }

  const legend = cache.legend as PointLegendData

  if (creditsum === 0) {
    legend.set("No authors", new PointInfo(nocreditColor, 0))
    cache.colormap.set(blob.path, nocreditColor)
    return
  }

  if (!authorUnion) throw Error("No unioned authors found")
  switch (Object.keys(authorUnion).length) {
    case 1:
      legend.set("Single author", new PointInfo(dominatedColor, 2))
      cache.colormap.set(blob.path, dominatedColor)
      return
    default:
      legend.set("Multiple authors", new PointInfo(defaultColor, 1))
      cache.colormap.set(blob.path, defaultColor)
      return
  }
}
