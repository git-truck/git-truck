import type { DatabaseInfo, GitBlobObject, GitObject, GitTreeObject, HexColor, Person, RepoData } from "~/shared/model"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import { type PointLegendData } from "~/components/legend/PointLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import { TopContributorMetric } from "~/metrics/topContributer"
import { TypeMetric } from "~/metrics/fileExtension"
import { LastChangedMetric } from "~/metrics/lastChanged"
import { CommitsMetric } from "~/metrics/mostCommits"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import { scaleOrdinal, schemeTableau10 } from "d3"
import sha1 from "sha1"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { FileSizeMetric } from "~/metrics/fileSize"
import { ContributorsMetric } from "./contributors"
import type { ReactNode } from "react"

/**
 * Defines the available metrics in the application
 *
 * This is the single source of truth for all metrics
 */

export const Metrics = {
  LAST_CHANGED: LastChangedMetric,
  FILE_TYPE: TypeMetric,
  FILE_SIZE: FileSizeMetric,
  MOST_COMMITS: CommitsMetric,
  MOST_CONTRIBUTIONS: LinesChangedMetric,
  TOP_CONTRIBUTOR: TopContributorMetric,
  CONTRIBUTORS: ContributorsMetric
} as const satisfies Record<string, Metric>

export type Metric = {
  name: string
  description: string
  icon: string
  inspectionPanels: Array<React.ComponentType>
  getTooltipContent: (
    /**
     * The hovered objectGitObject
     */
    obj: GitObject,
    /**
     * Data from the server
     */
    dbi: DatabaseInfo,
    options: {
      topContributorCutoff: number
      contributorColors: Record<string, HexColor>
    }
  ) => ReactNode
  metricFunctionFactory: (
    data: RepoData,
    options: { contributorColors: Record<string, HexColor>; topContributorCutoff: number }
  ) => MetricFunction
}

export type CategoricalMetric = Metric & {
  getCategories: (obj: GitObject, dbi: DatabaseInfo, options: { topContributorCutoff: number }) => string[]
}

export type SegmentedMetric = CategoricalMetric & {
  getBuckets(dbi: DatabaseInfo): { text: string; range: [number, number]; color: HexColor }[]
  getBucketIndex(obj: GitObject, dbi: DatabaseInfo): number
}

export type MetricType = keyof typeof Metrics

export type MetricFunction = (blob: GitBlobObject, cache: MetricCache) => void

export type MetricsData = {
  caches: Map<MetricType, MetricCache>
  contributorColorMap: Map<string, string>
}

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedContributorColors: Record<string, HexColor>,
  topContributorCutoff: number
): MetricsData {
  const contributorColors = generateContributorColors(
    data.databaseInfo.contributors,
    colorSeed,
    predefinedContributorColors
  )

  return {
    caches: setupMetricsCache(
      data.databaseInfo.fileTree,
      getMetricCalcs(data, contributorColors, topContributorCutoff)
    ),
    contributorColorMap: new Map(Object.entries(contributorColors))
  }
}

export const sizeMetricDescriptions: Record<SizeMetricType, string> = {
  FILE_SIZE: "Files are sized based on their file size in bytes.",
  EQUAL_SIZE: "All files are sized equally.",
  MOST_COMMITS: "Files are sized based on the number of commits in the selected time range.",
  LAST_CHANGED: "Files are sized based on how long ago they were changed.",
  MOST_CONTRIBUTIONS: "Files are sized based on how many line changes (additions and deletions) have been made to it."
}

export interface MetricCache {
  legend: PointLegendData | GradLegendData | SegmentLegendData | undefined
  categoriesMap: Map<string, Array<{ category: string; color: HexColor }>>
}

function generateContributorColors(
  contributors: Person[],
  colorSeed: string | null,
  predefinedContributorColors: Record<string, HexColor>
): Record<string, HexColor> {
  const contributorColorMap: Record<string, HexColor> = {}
  const colors = scaleOrdinal(schemeTableau10).range()

  const sortedContributors = contributors
    .map((contributor) => contributor.name)
    .sort((a, b) => sha1(a + colorSeed).localeCompare(sha1(b + colorSeed)))

  for (let i = 0; i < sortedContributors.length; i++) {
    const contributor = sortedContributors[i]
    const existing = predefinedContributorColors[contributor]
    if (existing) {
      contributorColorMap[contributor] = existing
      continue
    }
    const color = colors[i % colors.length] as HexColor
    contributorColorMap[contributor] = color
  }
  return contributorColorMap
}

function getMetricCalcs(
  data: RepoData,
  contributorColors: Record<string, HexColor>,
  topContributorCutoff: number
): Record<MetricType, MetricFunction> {
  return {
    FILE_TYPE: TypeMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    MOST_COMMITS: CommitsMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    LAST_CHANGED: LastChangedMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    TOP_CONTRIBUTOR: TopContributorMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    MOST_CONTRIBUTIONS: LinesChangedMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    FILE_SIZE: FileSizeMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff }),
    CONTRIBUTORS: ContributorsMetric.metricFunctionFactory(data, { contributorColors, topContributorCutoff })
  }
}

function setupMetricsCache(
  tree: GitTreeObject,
  metricCalcs: Record<MetricType, (blob: GitBlobObject, cache: MetricCache) => void>
) {
  const metricCache = new Map<MetricType, MetricCache>()
  setupMetricsCacheRec(tree, metricCalcs, metricCache)
  return metricCache
}

function setupMetricsCacheRec(
  tree: GitTreeObject,
  metricCalcs: Record<MetricType, MetricFunction>,
  acc: Map<MetricType, MetricCache>
) {
  for (const child of tree.children) {
    switch (child.type) {
      case "tree": {
        setupMetricsCacheRec(child, metricCalcs, acc)
        break
      }
      case "blob": {
        const entries = Object.entries(metricCalcs) as [MetricType, MetricFunction][]
        for (const [metricType, metricFunc] of entries) {
          if (!acc.has(metricType))
            acc.set(metricType, {
              legend: undefined,
              categoriesMap: new Map<string, Array<{ category: string; color: `#${string}` }>>()
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: undefined,
              categoriesMap: new Map<string, Array<{ category: string; color: `#${string}` }>>()
            }
          )
        }
        break
      }
    }
  }
}
