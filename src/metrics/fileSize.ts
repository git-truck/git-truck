import type { DatabaseInfo, GitBlobObject, GitObject } from "~/shared/model"
import { type MetricCache } from "~/metrics/metrics"
import { noEntryColor } from "~/const"
import { mdiResize } from "@mdi/js"
import { hslToHex, isBlob, rgbToHex } from "~/shared/util"
import { interpolateCool, scaleLog, scaleLinear } from "d3"
import { SpectrumTranslater } from "~/metrics/metricUtils"
import { feature_flags } from "~/feature_flags"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import byteSize from "byte-size"

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function uniqueSorted(values: number[]): number[] {
  return values
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b)
    .filter((v, i, arr) => i === 0 || v > arr[i - 1])
}

function getPrettyThresholds(min: number, max: number, desiredBuckets = 7): number[] {
  if (max <= min) return [max]

  // Prefer logarithmic nice ticks for file sizes; fallback to linear when needed.
  const logMin = Math.max(1, min)
  let ticks = scaleLog().domain([logMin, max]).nice().ticks(desiredBuckets)

  if (ticks.length < 2) {
    ticks = scaleLinear().domain([min, max]).nice().ticks(desiredBuckets)
  }

  return uniqueSorted(ticks).filter((t) => t > min && t < max)
}

export const FileSizeMetric = {
  name: "File size",
  icon: mdiResize,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTooltipContent(obj: GitObject, dbi: DatabaseInfo) {
    if (!isBlob(obj)) {
      // TODO: Aggregate folder size
      return "FileSizeMetric is only defined for blobs"
    }
    // const count = contributors.length || 0
    const fileSizeInBytes = obj.sizeInBytes
    if (fileSizeInBytes === undefined || fileSizeInBytes === null) {
      return "Size unknown"
    }
    const formattedSize = byteSize(fileSizeInBytes)

    return formattedSize.toString()

    // return `${count} contributor${count !== 1 ? "s" : ""}`
  },
  categorical: {
    getMinValue: (blob: GitBlobObject) => blob.sizeInBytes ?? 0,
    getMaxValue: (blob: GitBlobObject) => blob.sizeInBytes ?? 0,
    getCategory: (dbi: DatabaseInfo, fileSize: number) => {
      const categories = FileSizeMetric.categorical.getCategories(dbi)
      const lastIndex = categories.groupings.length - 1
      return categories.groupings.findIndex((g, i) =>
        i === lastIndex
          ? fileSize >= g.range[0] && fileSize <= g.range[1]
          : fileSize >= g.range[0] && fileSize < g.range[1]
      )
    },
    getCategories: (dbi: DatabaseInfo) => {
      const min = Math.max(0, dbi.minFileSize)
      const max = Math.max(min, dbi.maxFileSize)

      const thresholds = getPrettyThresholds(min, max, 7)
      const edges = uniqueSorted([min, ...thresholds, max])

      const groupings = Array.from({ length: Math.max(1, edges.length - 1) }, (_, i) => {
        const low = edges[i] ?? min
        const high = edges[i + 1] ?? max
        const text = i === 0 ? `<= ${formatBytesShort(high)}` : `> ${formatBytesShort(low)}`
        return {
          text,
          range: [low, high] as [number, number]
        }
      })

      const colorDenominator = Math.max(1, groupings.length - 1)
      return {
        groupings: groupings.map((g, i) => ({ ...g, color: rgbToHex(interpolateCool(i / colorDenominator)) }))
      }
      // if (!cache.legend) {
      //   cache.legend = feature_flags.lastChangedAsGrad
      //     ? ({
      //         minValue: data.databaseInfo.oldestChangeDate,
      //         maxValue: newestEpoch,
      //         minValueAltFormat: dateFormatShort(data.databaseInfo.oldestChangeDate * 1000),
      //         maxValueAltFormat: dateFormatShort(newestEpoch * 1000),
      //         minColor: rgbToHex(domainedScale(data.databaseInfo.oldestChangeDate)),
      //         maxColor: rgbToHex(domainedScale(newestEpoch))
      //       } satisfies GradLegendData)
      //     : ({
      //         steps: getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.oldestChangeDate) + 1,
      //         textGenerator: (n) => groupings[n].text,
      //         colorGenerator: (n) => groupings[n].color,
      //         offsetStepCalc: (blob) =>
      //           getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.lastChanged[blob.path] ?? 0) ?? -1
      //       } satisfies SegmentLegend
    }
  },
  metricFunctionCreator: (databaseInfo: DatabaseInfo) => (blob: GitBlobObject, cache: MetricCache) => {
    const fileSizeGroupings = FileSizeMetric.categorical.getCategories(databaseInfo)
    const fileSizeMapper = new FileSizeTranslater(databaseInfo.minFileSize, databaseInfo.maxFileSize)
    if (feature_flags.fileSizeAsGrad) {
      if (!cache.legend) {
        cache.legend = {
          minValue: databaseInfo.minFileSize,
          maxValue: databaseInfo.maxFileSize,
          minValueAltFormat: undefined,
          maxValueAltFormat: undefined,
          minColor: fileSizeMapper.getColor(databaseInfo.minFileSize),
          maxColor: fileSizeMapper.getColor(databaseInfo.maxFileSize)
        } satisfies GradLegendData
      }
      fileSizeMapper.setColor(blob, cache, databaseInfo.fileSizes)
    } else {
      if (!cache.legend) {
        cache.legend = {
          steps: fileSizeGroupings.groupings.length,
          textGenerator: (n) => fileSizeGroupings.groupings[n].text,
          colorGenerator: (n) => fileSizeGroupings.groupings[n].color,
          offsetStepCalc: (blob) => {
            const size = databaseInfo.fileSizes[blob.path]
            return size === undefined ? -1 : FileSizeMetric.categorical.getCategory(databaseInfo, size)
          }
        } satisfies SegmentLegendData
      }
      const fileSize = databaseInfo.fileSizes[blob.path]
      if (fileSize === undefined) {
        cache.colormap.set(blob.path, noEntryColor)
        return
      }

      const category = FileSizeMetric.categorical.getCategory(databaseInfo, fileSize)
      if (category < 0) {
        cache.colormap.set(blob.path, noEntryColor)
        return
      }

      const color = fileSizeGroupings.groupings[category]?.color
      if (!color) {
        cache.colormap.set(blob.path, noEntryColor)
        return
      }

      cache.colormap.set(blob.path, color)
    }
  }
  // TODO: When metric refactoring is done, readd satisfies Metric
} as const // satisfies Metric

export class FileSizeTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(20, 100, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, fileSizePerFile: Record<string, number>) {
    const existing = fileSizePerFile[blob.path]
    const color = existing === undefined ? noEntryColor : this.getColor(existing)
    cache.colormap.set(blob.path, color)
  }
}
