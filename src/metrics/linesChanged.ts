import type { DatabaseInfo, GitBlobObject, GitObject, HexColor } from "~/shared/model"
import type { GradientedMetric, MetricCache } from "~/metrics/metrics"
import { getMinMaxValuesForMetric, SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber, isTree } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiPlusMinusVariant } from "@mdi/js"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"
import { reduceTree } from "~/shared/utils/tree"

const LINES_CHANGED_HUE = 118
const LINES_CHANGED_SATURATION = 50
const LINES_CHANGED_MIN_LIGHTNESS = 40
const LINES_CHANGED_MAX_LIGHTNESS = 92

export const LinesChangedMetric: GradientedMetric = {
  icon: mdiPlusMinusVariant,
  name: "Lines Changed",
  description: "Files are colored based on how many line changes (additions and deletions) have been made to it.",
  inspectionPanels: [
    {
      title: "Lines Changed",
      content: GradientLegend,
      description: "Files colored based on their accumulated number of line changes.",
      actions: { search: false, clear: false }
    }
  ],
  getTooltipContent(obj, dbi) {
    const contribs = dbi.contribSumPerFile[obj.path]
    if (!contribs) {
      return "No activity in selected range"
    }
    return `${formatLargeNumber(contribs)} lines`
  },
  metricFunctionFactory(data, root) {
    const { min: minContribCount, max: maxContribCount } = getMinMaxValuesForMetric(
      root,
      data.databaseInfo.contribSumPerFile
    )
    const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

    return (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) {
        cache.legend = {
          minValue: minContribCount,
          maxValue: maxContribCount,
          minValueAltFormat: undefined,
          maxValueAltFormat: undefined,
          minColor: contribmapper.getColor(minContribCount),
          maxColor: contribmapper.getColor(maxContribCount)
        } satisfies GradLegendData
      }
      contribmapper.setColor(blob, cache, data.databaseInfo.contribSumPerFile)
    }
  },
  //GradientLegend specific function
  getColorFromValue(value: number, dbi: DatabaseInfo, cache: MetricCache) {
    const legend = cache.legend as GradLegendData
    if (!Number.isFinite(value) || value <= 0) return noEntryColor
    const cappedValue = Math.max(legend.minValue, Math.min(value, legend.maxValue))
    const translater = new SpectrumTranslater(
      legend.minValue,
      legend.maxValue,
      LINES_CHANGED_MIN_LIGHTNESS,
      LINES_CHANGED_MAX_LIGHTNESS
    )
    const lightness = translater.inverseTranslate(cappedValue)
    return hslToHex(LINES_CHANGED_HUE, LINES_CHANGED_SATURATION, lightness) as HexColor
  },
  //GradientLegend specific function
  getColorFromObject(obj: GitObject, dbi: DatabaseInfo, cache: MetricCache) {
    const contribSum = isTree(obj)
      ? reduceTree(obj, (s, o) => s + (dbi.contribSumPerFile[o.path] || 0), 0 as number)
      : (dbi.contribSumPerFile[obj.path] ?? 0)
    if (contribSum <= 0) return noEntryColor
    return this.getColorFromValue(contribSum, dbi, cache)
  }
}

class ContribAmountTranslater {
  readonly translater: SpectrumTranslater

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, LINES_CHANGED_MIN_LIGHTNESS, LINES_CHANGED_MAX_LIGHTNESS)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(LINES_CHANGED_HUE, LINES_CHANGED_SATURATION, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, contribCountPerFile: Record<string, number>) {
    const existing = contribCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
  }
}
