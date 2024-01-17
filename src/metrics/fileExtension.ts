import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import { getColorFromExtension } from "./metricUtils"
import type { MetricCache } from "./metrics"

export function setExtensionColor(blob: HydratedGitBlobObject, cache: MetricCache) {
  const extension = blob.name.substring(blob.name.lastIndexOf(".") + 1)
  const color = getColorFromExtension(extension)
  const legend = cache.legend as PointLegendData
  if (color) {
    if (legend.has(extension)) {
      legend.get(extension)?.add(1)
    } else {
      legend.set(extension, new PointInfo(color, 1))
    }
    cache.colormap.set(blob.path, color)
  } else {
    if (!legend.has("Other")) legend.set("Other", new PointInfo("#808080", 0))
    cache.colormap.set(blob.path, "#808080")
  }
}
