import { dateFormatRelative, dateFormatShort, rgbToHex } from "~/shared/util"
import { interpolateCool, scaleSequential } from "d3"
import { feature_flags } from "~/feature_flags"
import type { Metric, MetricCache } from "~/metrics/metrics"
import { mdiPulse } from "@mdi/js"
import type { GitBlobObject } from "~/shared/model"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"
import { SegmentLegend, type SegmentLegendData } from "~/components/legend/SegmentLegend"
import { UNKNOWN_CATEGORY, noEntryColor } from "~/const"

export const LastChangedMetric: Metric = {
  name: "Last changed",
  description: "Files are colored based on how long ago they were changed.",
  icon: mdiPulse,
  inspectionPanels: [feature_flags.lastChangedAsGrad ? GradientLegend : SegmentLegend],
  getTooltipContent(obj, dbi) {
    const epoch = dbi.lastChanged[obj.path]
    if (!epoch) {
      return "No activity in selected range"
    }
    return dateFormatRelative(epoch)
  },
  metricFunctionFactory(data, _root) {
    const groupings = lastChangedGroupings(data.databaseInfo.newestChangeDate, data.databaseInfo.oldestChangeDate)

    return (blob: GitBlobObject, cache: MetricCache) => {
      const domainedScale = scaleSequential(interpolateCool).domain([
        data.databaseInfo.oldestChangeDate,
        data.databaseInfo.newestChangeDate
      ])
      if (!cache.legend) {
        cache.legend = feature_flags.lastChangedAsGrad
          ? ({
              minValue: data.databaseInfo.oldestChangeDate,
              maxValue: data.databaseInfo.newestChangeDate,
              minValueAltFormat: dateFormatShort(data.databaseInfo.oldestChangeDate * 1000),
              maxValueAltFormat: dateFormatShort(data.databaseInfo.newestChangeDate * 1000),
              minColor: rgbToHex(domainedScale(data.databaseInfo.oldestChangeDate)),
              maxColor: rgbToHex(domainedScale(data.databaseInfo.newestChangeDate))
            } satisfies GradLegendData)
          : ({
              steps:
                getLastChangedIndex(groupings, data.databaseInfo.newestChangeDate, data.databaseInfo.oldestChangeDate) +
                1,
              textGenerator: (n) => groupings[n].text,
              colorGenerator: (n) => groupings[n].color,
              offsetStepCalc: (blob) =>
                getLastChangedIndex(
                  groupings,
                  data.databaseInfo.newestChangeDate,
                  data.databaseInfo.lastChanged[blob.path] ?? 0
                ) ?? -1
            } satisfies SegmentLegendData)
      }

      const existing = data.databaseInfo.lastChanged[blob.path]
      // const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
      const color = rgbToHex(domainedScale(existing ?? 0))
      if (!color) {
        cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
        return
      }
      cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
    }
  }
}
interface lastChangedGroup {
  epoch: number
  color: `#${string}`
  text: string
}

function lastChangedGroupings(newestEpoch: number, _oldestChangeDate: number): lastChangedGroup[] {
  // const scale = scaleSequential(interpolateCool)
  // , [oldestChangeDate, newestEpoch])

  return feature_flags.newLastChangedColorScheme
    ? [
        { epoch: 0, text: dateFormatShort(newestEpoch * 1000) },
        { epoch: 86400, text: ">1d" },
        { epoch: 604800, text: ">1w" },
        { epoch: 2629743, text: ">1m" },
        { epoch: 31556926, text: ">1y" },
        { epoch: 31556926 * 2, text: ">2y" },
        { epoch: 31556926 * 4, text: ">4y" }
      ].map((group, i, arr) => ({ ...group, color: rgbToHex(interpolateCool(i / arr.length)) as `#${string}` }))
    : [
        { epoch: 0, text: dateFormatShort(newestEpoch * 1000), color: "#cff2ff" },
        { epoch: 86400, text: "+1d", color: "#c6dbef" },
        { epoch: 604800, text: "+1w", color: "#9ecae1" },
        { epoch: 2629743, text: "+1m", color: "#6baed6" },
        { epoch: 31556926, text: "+1y", color: "#4292c6" },
        { epoch: 31556926 * 2, text: "+2y", color: "#2171b5" },
        { epoch: 31556926 * 4, text: "+4y", color: "#084594" }
      ]
}

function getLastChangedIndex(groupings: lastChangedGroup[], newest: number, input: number) {
  const diff = newest - input
  let index = 0
  while (index < groupings.length - 1) {
    if (diff < groupings[index + 1].epoch) return index
    else index++
  }
  return index
}
