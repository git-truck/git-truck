import { dateFormatRelative, dateFormatShort, isBlob, isTree, rgbToHex } from "~/shared/util"
import { interpolateTurbo } from "d3"
import type { MetricCache, SegmentedMetric } from "~/metrics/metrics"
import { mdiPulse } from "@mdi/js"
import type { GitBlobObject, GitObject, DatabaseInfo } from "~/shared/model"
import { SegmentLegend, type SegmentLegendData } from "~/components/legend/SegmentLegend"
import { UNKNOWN_CATEGORY, noEntryColor } from "~/const"
import { reduceTree } from "~/shared/utils/tree"

/**
 * Time thresholds for last changed groupings (in seconds)
 */
const TIMEUNITS = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2629743,
  SIX_MONTHS: 2629743 * 6,
  ONE_YEAR: 31556926,
  TWO_YEARS: 31556926 * 2,
  FOUR_YEARS: 31556926 * 4
}

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
  getTooltipContent(obj: GitObject, dbi: DatabaseInfo) {
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

  getCategories(obj: GitObject, dbi: DatabaseInfo) {
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
  getBuckets(dbi: DatabaseInfo) {
    const now = Math.floor(Date.now() / 1000)
    const newestDate = new Date(dbi.newestChangeDate * 1000)
    const today = new Date(now * 1000)

    // Check if newest change is from today
    const isToday =
      newestDate.getFullYear() === today.getFullYear() &&
      newestDate.getMonth() === today.getMonth() &&
      newestDate.getDate() === today.getDate()

    const firstBucketText = isToday ? "Today" : dateFormatShort(dbi.newestChangeDate * 1000)

    const timeDifferences = [
      {
        text: firstBucketText,
        range: [0, TIMEUNITS.ONE_DAY] as [number, number]
      },
      {
        text: "+1d",
        range: [TIMEUNITS.ONE_DAY, TIMEUNITS.ONE_WEEK] as [number, number]
      },
      {
        text: "+1w",
        range: [TIMEUNITS.ONE_WEEK, TIMEUNITS.ONE_MONTH] as [number, number]
      },
      {
        text: "+1m",
        range: [TIMEUNITS.ONE_MONTH, TIMEUNITS.SIX_MONTHS] as [number, number]
      },
      {
        text: "+6m",
        range: [TIMEUNITS.SIX_MONTHS, TIMEUNITS.ONE_YEAR] as [number, number]
      },
      {
        text: "+1y",
        range: [TIMEUNITS.ONE_YEAR, TIMEUNITS.TWO_YEARS] as [number, number]
      },
      {
        text: "+2y",
        range: [TIMEUNITS.TWO_YEARS, TIMEUNITS.FOUR_YEARS] as [number, number]
      },
      {
        text: "+4y",
        range: [TIMEUNITS.FOUR_YEARS, Infinity] as [number, number]
      }
    ].map((group, i, arr) => ({
      ...group,
      //Offset color spectrum to avoid very light colors
      color: rgbToHex(interpolateTurbo(1 - i / arr.length)) as `#${string}`
    }))

    return timeDifferences
  },

  getBucketIndex(obj: GitObject, dbi: DatabaseInfo): number {
    const epoch = isTree(obj)
      ? reduceTree(obj, (s, o) => Math.max(s, dbi.lastChanged[o.path] ?? 0), 0 as number)
      : dbi.lastChanged[obj.path]

    if (epoch === undefined || epoch === 0) {
      return -1
    }

    const timeDiff = dbi.newestChangeDate - epoch
    const buckets = this.getBuckets(dbi)
    const lastIndex = buckets.length - 1
    return buckets.findIndex((g, i) =>
      i === lastIndex
        ? timeDiff >= g.range[0] && timeDiff <= g.range[1]
        : timeDiff >= g.range[0] && timeDiff < g.range[1]
    )
  }
} as const
