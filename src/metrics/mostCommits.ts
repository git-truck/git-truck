import type { GitBlobObject } from "~/shared/model"
import type { Metric, MetricCache } from "~/metrics/metrics"
import { getMinMaxValuesForMetric, SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiSourceCommit } from "@mdi/js"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"

export const COMMITS_HUE = 20
export const COMMITS_SATURATION = 100
export const COMMITS_MIN_LIGHTNESS = 50
export const COMMITS_MAX_LIGHTNESS = 95

export const CommitsMetric: Metric = {
  icon: mdiSourceCommit,
  name: "Commits",
  description: "Files are colored based on the number of commits in the selected time range.",
  inspectionPanels: [{ title: "Commits", content: GradientLegend}],
  getTooltipContent(obj, dbi) {
    const noCommits = dbi.commitCounts[obj.path]
    if (!noCommits) {
      return "No activity in selected range"
    }
    return `${formatLargeNumber(noCommits)} commit${noCommits > 1 ? "s" : ""}`
  },
  metricFunctionFactory(data, root) {
    const { min: minCommitCount, max: maxCommitCount } = getMinMaxValuesForMetric(root, data.databaseInfo.commitCounts)
    const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)

    return (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) {
        cache.legend = {
          minValue: minCommitCount,
          maxValue: maxCommitCount,
          minValueAltFormat: undefined,
          maxValueAltFormat: undefined,
          minColor: commitmapper.getColor(minCommitCount),
          maxColor: commitmapper.getColor(maxCommitCount)
        } satisfies GradLegendData
      }
      commitmapper.setColor(blob, cache, data.databaseInfo.commitCounts)
    }
  }
}

class CommitAmountTranslater {
  readonly translater: SpectrumTranslater

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, COMMITS_MIN_LIGHTNESS, COMMITS_MAX_LIGHTNESS)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(COMMITS_HUE, COMMITS_SATURATION, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, commitCountPerFile: Record<string, number>) {
    const existing = commitCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
  }
}
