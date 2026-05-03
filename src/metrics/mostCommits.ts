import type { DatabaseInfo, GitBlobObject, GitObject, HexColor } from "~/shared/model"
import type { GradientedMetric, MetricCache } from "~/metrics/metrics"
import { getMinMaxValuesForMetric, SpectrumTranslater } from "~/metrics/metricUtils"
import { hslToHex, formatLargeNumber } from "~/shared/util"
import { noEntryColor, UNKNOWN_CATEGORY } from "~/const"
import { mdiSourceCommit } from "@mdi/js"
import { GradientLegend, type GradLegendData } from "~/components/legend/GradiantLegend"

const COMMITS_HUE = 20
const COMMITS_SATURATION = 100
const COMMITS_MIN_LIGHTNESS = 50
const COMMITS_MAX_LIGHTNESS = 95

export const CommitsMetric: GradientedMetric = {
  icon: mdiSourceCommit,
  name: "Commits",
  description: "Files are colored based on the number of commits in the selected time range.",
  inspectionPanels: [
    {
      title: "Commits",
      content: GradientLegend,
      description: "Files colored based on the number of commits made to them.",
      actions: { search: false, clear: false }
    }
  ],
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
  },
  //GradientLegend specific function
  getColorFromValue(value: number, dbi: DatabaseInfo, cache: MetricCache): HexColor {
    const legend = cache.legend as GradLegendData
    const cappedValue = Math.min(value, legend.maxValue)
    const translater = new SpectrumTranslater(
      legend.minValue,
      legend.maxValue,
      COMMITS_MIN_LIGHTNESS,
      COMMITS_MAX_LIGHTNESS
    )
    const lightness = translater.inverseTranslate(cappedValue)
    return hslToHex(COMMITS_HUE, COMMITS_SATURATION, lightness) as HexColor
  },
  //GradientLegend specific function
  getColorFromObject(_obj: GitObject, _dbi: DatabaseInfo, _cache: MetricCache) {
    throw new Error("getColorFromObject should not be called for CommitsMetric, as commits don't stack across files")
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
