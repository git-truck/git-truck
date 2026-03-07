import type { GitBlobObject } from "~/shared/model"
import { getColorFromExtension } from "~/metrics/metricUtils"
import type { MetricCache } from "~/metrics/metrics"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo } from "~/components/legend/PointLegend"
import { noEntryColor } from "~/const"
import { feature_flags } from "~/feature_flags"

export function setExtensionColor(blob: GitBlobObject, cache: MetricCache) {
  const extensionInfo = getColorFromExtension(blob.extension)
  let color = extensionInfo?.color

  if (extensionInfo?.lang === "JSON") {
    color = "#f6bf00"
  }

  const legend = cache.legend as PointLegendData

  //TODO: Make feature_flag a setting (grouping all non-colored entries under "Other" category)
  //Add uncolored (e.g. png, gif) under parent category "Other"
  if (feature_flags.group_noncode_filetypes_in_other) {
    if (color) {
      if (legend.has(blob.extension)) {
        legend.get(blob.extension)?.add(1)
      } else {
        legend.set(blob.extension, new PointInfo(color, 1))
      }
      cache.colormap.set(blob.path, color)
    } else {
      if (!legend.has("Other")) {
        legend.set("Other", new PointInfo(noEntryColor, 0))
      }
      if (legend.get("Other")?.children?.has(blob.extension)) {
        legend.get("Other")?.children?.get(blob.extension)?.add(1)
      } else {
        console.warn(`Created extension ${blob.extension}, categorizing under "Other"`)
        legend.get("Other")?.addChild(blob.extension, new PointInfo(noEntryColor, 1))
      }
      legend.get("Other")?.add(1)
      cache.colormap.set(blob.path, noEntryColor)
    }
    //Add uncolored (e.g. png, gif) as normal categories
  } else {
    if (legend.has(blob.extension)) {
      legend.get(blob.extension)?.add(1)
    } else {
      legend.set(blob.extension, new PointInfo(color ? color : noEntryColor, 1))
    }
    cache.colormap.set(blob.path, color ? color : noEntryColor)
  }
}
