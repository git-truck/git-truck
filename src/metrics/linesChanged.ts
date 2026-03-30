import type { GitBlobObject } from "~/shared/model"
import type { Metric, MetricCache } from "~/metrics/metrics"
import { SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiPlusMinusVariant } from "@mdi/js"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"

export const LinesChangedMetric: Metric = {
  icon: mdiPlusMinusVariant,
  name: "Lines Changed",
  description: "Files are colored based on how many line changes (additions and deletions) have been made to it.",
  inspectionPanels: [GradientLegend],
  getTooltipContent(obj, dbi) {
    const contribs = dbi.contribSumPerFile[obj.path]
    if (!contribs) {
      return "No activity in selected range"
    }
    return `${formatLargeNumber(contribs)} lines`
  },
  metricFunctionFactory(data) {
    const maxContribCount = data.databaseInfo.maxMinContribCounts.max
    const minContribCount = data.databaseInfo.maxMinContribCounts.min
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

export class ContribAmountTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 40
  readonly max_lightness = 92

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(118, 50, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, contribCountPerFile: Record<string, number>) {
    const existing = contribCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
  }
}
