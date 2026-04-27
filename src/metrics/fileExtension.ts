import type { GitBlobObject } from "~/shared/model"
import { getColorFromExtension, countLeafNodes } from "~/metrics/metricUtils"
import type { CategoricalMetric, MetricCache } from "~/metrics/metrics"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo, PointLegend } from "~/components/legend/PointLegend"
import { noEntryColor } from "~/const"
import { feature_flags } from "~/feature_flags"
import { mdiFileOutline } from "@mdi/js"
import { isBlob } from "~/shared/util"

export const TypeMetric: CategoricalMetric = {
  name: "File type",
  description: "Files are colored based on their file extension, which is useful to get an overview of the codebase.",
  icon: mdiFileOutline,
  inspectionPanels: [PointLegend],
  getTooltipContent(obj, dbi, options) {
    return this.getCategories(obj, dbi, options)
  },
  getCategories(obj) {
    return isBlob(obj) ? [obj.extension] : []
  },
  //For now we don't use _root for calculation
  metricFunctionFactory(_data, root) {
    return (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) {
        cache.legend = {
          entries: new Map<string, PointInfo>(),
          totalWeight: countLeafNodes(root)
        } satisfies PointLegendData
      }
      setExtensionColor(blob, cache)
    }
  }
}

function setExtensionColor(blob: GitBlobObject, cache: MetricCache) {
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
      if (legend.entries.has(blob.extension)) {
        legend.entries.get(blob.extension)?.add(1)
      } else {
        legend.entries.set(blob.extension, new PointInfo(color, 1))
      }
      cache.categoriesMap.set(blob.path, [{ category: blob.extension, color }])
    } else {
      if (!legend.entries.has("Other")) {
        legend.entries.set("Other", new PointInfo(noEntryColor, 0))
      }
      if (legend.entries.get("Other")?.children?.has(blob.extension)) {
        legend.entries.get("Other")?.children?.get(blob.extension)?.add(1)
      } else {
        legend.entries.get("Other")?.addChild(blob.extension, new PointInfo(noEntryColor, 1))
      }
      legend.entries.get("Other")?.add(1)
      cache.categoriesMap.set(blob.path, [{ category: "Other", color: noEntryColor }])
    }
    //Add uncolored (e.g. png, gif) as normal categories
  } else {
    if (legend.entries.has(blob.extension)) {
      legend.entries.get(blob.extension)?.add(1)
    } else {
      legend.entries.set(blob.extension, new PointInfo(color ? color : noEntryColor, 1))
    }
    cache.categoriesMap.set(blob.path, [{ category: blob.extension, color: color ? color : noEntryColor }])
  }
}
