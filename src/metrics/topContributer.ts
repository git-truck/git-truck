import type { GitBlobObject } from "~/shared/model"
import type { PointLegendData } from "~/components/legend/PointLegend"
import { PointInfo, PointLegend } from "~/components/legend/PointLegend"
import type { CategoricalMetric, MetricCache } from "~/metrics/metrics"
import { MULTIPLE_CONTRIBUTORS, noEntryColor } from "~/const"
import { mdiPodiumGold } from "@mdi/js"
import { ContributorsInspection } from "~/components/inspection/ContributorsInspection"
import { PercentageSlider } from "~/components/PercentageSlider"

export const TopContributorMetric: CategoricalMetric = {
  name: "Top contributor",
  description: "Files are colored based on the top contributor for each file.",
  icon: mdiPodiumGold,
  inspectionPanels: [PointLegend, PercentageSlider, ContributorsInspection],
  getTooltipContent(obj, dbi, { topContributorCutoff }) {
    const top = dbi.topContributors[obj.path]

    const contribSum = dbi.contribSumPerFile[obj.path]
    if (!top) {
      return "No activity in selected range"
    }
    if (top.hasTie) {
      return MULTIPLE_CONTRIBUTORS
    }
    if (contribSum === 0) {
      return top.contributor
    }
    const contributorPercentage = Math.round((top.contribcount / contribSum) * 100)
    if (contributorPercentage < topContributorCutoff) {
      // TODO show how many contributors if no top contributor
      return MULTIPLE_CONTRIBUTORS
    }
    return `${top.contributor} ${contributorPercentage}%`
  },
  getCategories(obj, dbi, { topContributorCutoff }) {
    const top = dbi.topContributors[obj.path]
    if (!top) {
      return ["No contributors"]
    }
    if (top.hasTie) {
      return [MULTIPLE_CONTRIBUTORS]
    }
    const contribSum = dbi.contribSumPerFile[obj.path]
    if (contribSum === 0) {
      return [top.contributor]
    }
    const contributorPercentage = Math.round((top.contribcount / contribSum) * 100)
    if (contributorPercentage < topContributorCutoff) {
      return [MULTIPLE_CONTRIBUTORS]
    }
    return [top.contributor]
  },
  metricFunctionFactory(data, { contributorColors, topContributorCutoff }) {
    return (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) cache.legend = new Map<string, PointInfo>() satisfies PointLegendData
      setTopContributorColor(
        contributorColors,
        blob,
        cache,
        data.databaseInfo.topContributors,
        topContributorCutoff,
        data.databaseInfo.contribSumPerFile
      )
    }
  }
}

function setTopContributorColor(
  contributorColors: Record<string, `#${string}`>,
  blob: GitBlobObject,
  cache: MetricCache,
  topContributorPerFile: Record<string, { contributor: string; contribcount: number; hasTie: boolean }>,
  topContributorCutoff: number,
  contribSumPerFile: Record<string, number>
) {
  const topContributor = topContributorPerFile[blob.path]
  const contribSum = contribSumPerFile[blob.path]
  const legend = cache.legend as PointLegendData

  // helper to bump multiple-contributors count
  const bumpMultiple = () => {
    if (legend.has(MULTIPLE_CONTRIBUTORS)) {
      legend.get(MULTIPLE_CONTRIBUTORS)?.add(1)
    } else {
      legend.set(MULTIPLE_CONTRIBUTORS, new PointInfo(noEntryColor, 1))
    }
    cache.categoriesMap.set(blob.path, [{ category: MULTIPLE_CONTRIBUTORS, color: noEntryColor }])
  }
  //No activity in selected range == no top contributor
  if (!topContributor) {
    return
  }

  //There is a tie between top contributors, so we can't determine a single top contributor
  if (topContributor.hasTie) {
    bumpMultiple()
    return
  }

  //There is an empty file
  if (contribSum === 0) {
    const color = contributorColors[topContributor.contributor] ?? noEntryColor
    cache.categoriesMap.set(blob.path, [{ category: topContributor.contributor, color }])

    if (legend.has(topContributor.contributor)) {
      legend.get(topContributor.contributor)?.add(1)
      return
    }
    legend.set(topContributor.contributor, new PointInfo(color, 1))
    return
  }

  //The top contributor does not meet the cutoff
  const contributorPercentage = (topContributor.contribcount / contribSum) * 100
  if (contributorPercentage < topContributorCutoff) {
    bumpMultiple()
    return
  }

  const color = contributorColors[topContributor.contributor] ?? noEntryColor
  cache.categoriesMap.set(blob.path, [{ category: topContributor.contributor, color }])

  if (legend.has(topContributor.contributor)) {
    legend.get(topContributor.contributor)?.add(1)
    return
  }
  legend.set(topContributor.contributor, new PointInfo(color, 1))
}
