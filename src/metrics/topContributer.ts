import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import type { AuthorshipType, MetricCache } from "./metrics"

export function setDominantAuthorColor(
  authorColors: Map<string, `#${string}`>,
  blob: HydratedGitBlobObject,
  cache: MetricCache,
  authorshipType: AuthorshipType
) {
  const authorUnion = blob.unionedAuthors?.[authorshipType]
  if (!authorUnion) {
    console.warn("No author union found for file", blob.path)
    return
  }
  const sorted = Object.entries(authorUnion).sort(([k1, v1], [k2, v2]) => {
    if (v1 === 0 || v2 === 0 || !k1 || !k2) return -1
    return v2 - v1
  })
  if (!sorted[0]) {
    console.warn("No sorted authors for file", blob.path)
    return
  }

  const [dom] = sorted[0]
  const legend = cache.legend as PointLegendData
  const color = authorColors.get(dom) ?? "#808080"

  cache.colormap.set(blob.path, color)
  if (blob.dominantAuthor) {
    blob.dominantAuthor[authorshipType] = sorted[0]
  }

  if (legend.has(dom)) {
    legend.get(dom)?.add(1)
    return
  }
  legend.set(dom, new PointInfo(color, 1))
}
