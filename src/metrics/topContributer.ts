import { HydratedGitBlobObject } from "~/analyzer/model"
import { PointInfo, PointLegendData } from "~/components/legend/PointLegend"
import { AuthorshipType, MetricCache } from "./metrics"

export function setDominantAuthorColor(
    authorColors: Map<string, string>,
    blob: HydratedGitBlobObject,
    cache: MetricCache,
    authorshipType: AuthorshipType
) {
    const authorUnion = blob.unionedAuthors?.[authorshipType]
    let sorted: [string, number][]
    try {
      if (!authorUnion) throw Error
      sorted = Object.entries(authorUnion).sort(([k1, v1], [k2, v2]) => {
        if (v1 === 0 || v2 === 0 || !k1 || !k2) throw Error
        if (v1 < v2) return 1
        else if (v1 > v2) return -1
        else return 0
      })
      if (!sorted[0]) throw Error
    } catch {
      return
    }
  
    const [dom] = sorted[0]
    const legend = cache.legend as PointLegendData
    const color = authorColors.get(dom) ?? "grey"
  
    cache.colormap.set(blob.path, color)
    blob.dominantAuthor?.set(authorshipType, sorted[0])
  
    if (legend.has(dom)) {
      legend.get(dom)?.add(1)
      return
    }
    legend.set(dom, new PointInfo(color, 1))
}