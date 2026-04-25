import type { DatabaseInfo, GitBlobObject, GitObject } from "~/shared/model"
import { type MetricCache, type SegmentedMetric } from "~/metrics/metrics"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiResize } from "@mdi/js"
import { hslToHex, isBlob, isTree, rgbToHex } from "~/shared/util"
import { interpolateCool, scaleLog, scaleLinear } from "d3"
import { SpectrumTranslater } from "~/metrics/metricUtils"
import { feature_flags } from "~/feature_flags"
import { SegmentLegend, type SegmentLegendData } from "~/components/legend/SegmentLegend"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import byteSize from "byte-size"
import { reduceTree } from "~/shared/utils/tree"

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

export const FileSizeMetric: SegmentedMetric = {
  name: "File size",
  description: "Files are colored based on their file size in bytes.",
  icon: mdiResize,
  inspectionPanels: [SegmentLegend],
  getTooltipContent(obj: GitObject, _dbi: DatabaseInfo) {
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

  getCategories(obj: GitObject, dbi: DatabaseInfo) {
    const fileSize = isTree(obj) ? reduceTree(obj, (s, o) => s + o.sizeInBytes, 0 as number) : obj.sizeInBytes
    const categories = this.getBuckets(dbi)
    const lastIndex = categories.length - 1

    return categories
      .filter((g, i) =>
        i === lastIndex
          ? fileSize >= g.range[0] && fileSize <= g.range[1]
          : fileSize >= g.range[0] && fileSize < g.range[1]
      )
      ?.map((c) => c.text)
  },

  //For now we don't use _root for calculation
  metricFunctionFactory({ databaseInfo: dbi }, _root) {
    return (blob: GitBlobObject, cache: MetricCache) => {
      const fileSizeGroupings = this.getBuckets(dbi)
      const fileSizeMapper = new FileSizeTranslater(dbi.minFileSize, dbi.maxFileSize)
      if (feature_flags.fileSizeAsGrad) {
        if (!cache.legend) {
          cache.legend = {
            minValue: dbi.minFileSize,
            maxValue: dbi.maxFileSize,
            minValueAltFormat: undefined,
            maxValueAltFormat: undefined,
            minColor: fileSizeMapper.getColor(dbi.minFileSize),
            maxColor: fileSizeMapper.getColor(dbi.maxFileSize)
          } satisfies GradLegendData
        }
        fileSizeMapper.setColor(blob, cache, dbi.fileSizes)
      } else {
        if (!cache.legend) {
          cache.legend = {
            steps: fileSizeGroupings.length,
            textGenerator: (n) => fileSizeGroupings[n].text,
            colorGenerator: (n) => fileSizeGroupings[n].color,
            offsetStepCalc: (blob) => {
              const size = dbi.fileSizes[blob.path]
              return size === undefined ? -1 : FileSizeMetric.getBucketIndex(blob, dbi)
            }
          } satisfies SegmentLegendData
        }
        const fileSize = dbi.fileSizes[blob.path]
        if (fileSize === undefined) {
          cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
          return
        }

        const index = FileSizeMetric.getBucketIndex(blob, dbi)
        if (index < 0) {
          cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
          return
        }

        const color = fileSizeGroupings[index]?.color
        if (!color) {
          cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color: noEntryColor }])
          return
        }

        cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
      }
    }
  },
  getBuckets(dbi: DatabaseInfo) {
    const min = Math.max(0, dbi.minFileSize)
    const max = Math.max(min, dbi.maxFileSize)

    const thresholds = getPrettyThresholds(min, max, 7)
    const edges = uniqueSorted([min, ...thresholds, max])

    const groupingsWithoutColor = Array.from({ length: Math.max(1, edges.length - 1) }, (_, i) => {
      const low = edges[i] ?? min
      const high = edges[i + 1] ?? max
      const text = i === 0 ? `<= ${byteSize(high, { precision: 0 })}` : `> ${byteSize(low, { precision: 0 })}`
      return {
        text,
        range: [low, high] as [number, number]
      }
    })

    const colorDenominator = Math.max(1, groupingsWithoutColor.length - 1)

    return groupingsWithoutColor.map((g, i) => ({
      ...g,
      color: rgbToHex(interpolateCool(i / colorDenominator))
    }))
  },

  getBucketIndex(obj: GitObject, dbi: DatabaseInfo) {
    const fileSize = isTree(obj) ? reduceTree(obj, (s, o) => s + o.sizeInBytes, 0 as number) : obj.sizeInBytes
    const categories = this.getBuckets(dbi)
    const lastIndex = categories.length - 1
    return categories.findIndex((g, i) =>
      i === lastIndex
        ? fileSize >= g.range[0] && fileSize <= g.range[1]
        : fileSize >= g.range[0] && fileSize < g.range[1]
    )
  }
} as const

class FileSizeTranslater {
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
    cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
  }
}
