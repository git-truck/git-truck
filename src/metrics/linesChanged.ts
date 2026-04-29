import type { GitBlobObject } from "~/shared/model"
import type { Metric, MetricCache } from "~/metrics/metrics"
import { getMinMaxValuesForMetric, SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiPlusMinusVariant } from "@mdi/js"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"

export const LINES_CHANGED_HUE = 118
export const LINES_CHANGED_SATURATION = 50
export const LINES_CHANGED_MIN_LIGHTNESS = 40
export const LINES_CHANGED_MAX_LIGHTNESS = 92

export const LinesChangedMetric: Metric = {
  icon: mdiPlusMinusVariant,
  name: "Lines Changed",
  description: "Files are colored based on how many line changes (additions and deletions) have been made to it.",
  inspectionPanels: [
    { title: "Lines Changed", content: GradientLegend}
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
