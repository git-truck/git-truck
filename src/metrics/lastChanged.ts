import { dateFormatRelative, isBlob, isTree } from "~/shared/util"
import type { MetricCache, SegmentedMetric } from "~/metrics/metrics"
import { mdiPulse } from "@mdi/js"
import type { GitBlobObject } from "~/shared/model"
import { SegmentLegend, type SegmentLegendData } from "~/components/legend/SegmentLegend"
import { UNKNOWN_CATEGORY, noEntryColor } from "~/const"
import { reduceTree } from "~/shared/utils/tree"
import { getLastChangedBucketIndex, getLastChangedBuckets } from "~/metrics/lastChangedBuckets"

export const LastChangedMetric: SegmentedMetric = {
  name: "Last changed",
  description: "Files are colored based on how long ago they were changed.",
  icon: mdiPulse,
  inspectionPanels: [
    {
      title: "Last Changed",
      content: SegmentLegend,
      description: "Files are colored based on how long ago they were changed (from latest commit).",
      actions: { search: false, clear: false }
    }
  ],
  getTooltipContent(obj, dbi) {
    if (!isBlob(obj)) {
      // TODO: Find max last changed time for tree
      return "LastChangedMetric is only defined for blobs"
    }

    const epoch = dbi.lastChanged[obj.path]
    if (!epoch) {
      return "No activity in selected range"
    }
    return dateFormatRelative(epoch)
  },

  getCategories(obj, dbi) {
    const epoch = isTree(obj)
      ? reduceTree(obj, (s, o) => Math.max(s, dbi.lastChanged[o.path] ?? 0), 0 as number)
      : dbi.lastChanged[obj.path]
    const timeDiff = dbi.newestChangeDate - (epoch ?? 0)
    const categories = this.getBuckets(dbi)
    const lastIndex = categories.length - 1

    return categories
      .filter((g, i) =>
        i === lastIndex
          ? timeDiff >= g.range[0] && timeDiff <= g.range[1]
          : timeDiff >= g.range[0] && timeDiff < g.range[1]
      )
      ?.map((c) => c.text)
  },

  //For now we don't use _root for calculation
  metricFunctionFactory({ databaseInfo: dbi }, _root) {
    const buckets = LastChangedMetric.getBuckets(dbi)

    return (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) {
        cache.legend = {
          steps: buckets.length,
          textGenerator: (n) => buckets[n].text,
          colorGenerator: (n) => buckets[n].color,
          offsetStepCalc: (blob) => {
            return LastChangedMetric.getBucketIndex(blob, dbi)
          }
        } satisfies SegmentLegendData
      }

      const epoch = dbi.lastChanged[blob.path]
      if (epoch === undefined) {
        cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
        return
      }

      const index = LastChangedMetric.getBucketIndex(blob, dbi)
      if (index < 0) {
        cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
        return
      }

      const color = buckets[index]?.color
      if (!color) {
        cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
        return
      }

      cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
    }
  },
  getBuckets: getLastChangedBuckets,

  getBucketIndex: getLastChangedBucketIndex
} as const
