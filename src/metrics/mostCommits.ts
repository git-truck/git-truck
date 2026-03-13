import type { GitBlobObject } from "~/shared/model"
import type { Metric, MetricCache } from "~/metrics/metrics"
import { SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiSourceCommit } from "@mdi/js"
import type { GradLegendData } from "~/components/legend/GradiantLegend"

export const CommitsMetric: Metric = {
  name: "Commits",
  description: "Files are colored based on the number of commits in the selected time range.",
  icon: mdiSourceCommit,
  getTooltipContent(obj, dbi) {
    const noCommits = dbi.commitCounts[obj.path]

    if (!noCommits) {
      return "No activity in selected range"
    }
    return `${formatLargeNumber(noCommits)} commit${noCommits > 1 ? "s" : ""}`
  },
  metricFunctionFactory(data) {
    const maxCommitCount = data.databaseInfo.maxCommitCount
    const minCommitCount = data.databaseInfo.minCommitCount
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

export class CommitAmountTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(20, 100, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, commitCountPerFile: Record<string, number>) {
    const existing = commitCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.categoriesMap.set(blob.path, [{ category: UNKNOWN_CATEGORY, color }])
  }
}
