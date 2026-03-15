import type { GitBlobObject, GitTreeObject, RepoData, DatabaseInfo, GitObject } from "~/shared/model"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import { PointInfo, type PointLegendData } from "~/components/legend/PointLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import { noEntryColor } from "~/const"
import { feature_flags } from "~/feature_flags"
import type { LegendType } from "~/components/legend/Legend"
import { FileExtensionMetric, setExtensionColor } from "~/metrics/fileExtension"
import { getLastChangedIndex, lastChangedGroupings, LastChangedMetric } from "~/metrics/lastChanged"
import { CommitAmountTranslater } from "~/metrics/mostCommits"
import { ContribAmountTranslater } from "~/metrics/linesChanged"
import { setDominantAuthorColor } from "~/metrics/topContributer"
import { interpolateCool, scaleOrdinal, scaleSequential, schemeTableau10 } from "d3"
import { dateFormatShort, rgbToHex } from "~/shared/util"
import sha1 from "sha1"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { ContributorsMetric } from "./contributors"

export type MetricsData = {
  caches: Map<MetricType, MetricCache>
  authorColorMap: Map<string, string>
}

export const Metric = {
  LAST_CHANGED: "Last changed",
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  CONTRIBUTORS: ContributorsMetric.name
}

export type MetricType = keyof typeof Metric

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): MetricsData {
  const authorColors = generateAuthorColors(data.databaseInfo.authors, colorSeed, predefinedAuthorColors)

  return {
    caches: setupMetricsCache(data.databaseInfo.fileTree, getMetricCalcs(data, authorColors, dominantAuthorCutoff)),
    authorColorMap: new Map(Object.entries(authorColors))
  }
}

export const colorMetricDescriptions: Record<MetricType, string> = {
  FILE_TYPE: "Files are colored based on their file extension, which is useful to get an overview of the codebase.",
  MOST_COMMITS: "Files are colored based on the number of commits in the selected time range.",
  LAST_CHANGED: "Files are colored based on how long ago they were changed.",
  TOP_CONTRIBUTOR: "Files are colored based on the top author for each file.",
  MOST_CONTRIBUTIONS:
    "Files are colored based on how many line changes (additions and deletions) have been made to it.",
  CONTRIBUTORS: "Files are colored based on which contributors have contributed to it."
}

export const sizeMetricDescriptions: Record<SizeMetricType, string> = {
  FILE_SIZE: "Files are sized based on their file size in bytes.",
  EQUAL_SIZE: "All files are sized equally.",
  MOST_COMMITS: "Files are sized based on the number of commits in the selected time range.",
  LAST_CHANGED: "Files are sized based on how long ago they were changed.",
  MOST_CONTRIBUTIONS: "Files are sized based on how many line changes (additions and deletions) have been made to it."
}

export const sizeMetricLegendDescriptions: Record<SizeMetricType, string> = {
  FILE_SIZE: "Larger node indicates larger file size.",
  EQUAL_SIZE: "All files have the same size.",
  MOST_COMMITS: "Larger node indicates more commits.",
  LAST_CHANGED: "Larger node indicates more recent changes.",
  MOST_CONTRIBUTIONS: "Larger node indicates more line changes."
}

export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    case "FILE_TYPE":
    case "TOP_CONTRIBUTOR":
      return "POINT"
    case "MOST_COMMITS":
    case "MOST_CONTRIBUTIONS":
      return "GRADIENT"
    case "LAST_CHANGED":
      return feature_flags.lastChangedAsGrad ? "GRADIENT" : "SEGMENTS"
    case "CONTRIBUTORS":
      return "POINT"
  }
}

export interface MetricCache {
  legend: PointLegendData | GradLegendData | SegmentLegendData | undefined
  colormap: Map<string, Array<`#${string}`>>
}

export function generateAuthorColors(
  authors: string[],
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>
): Record<string, `#${string}`> {
  const authorColorMap: Record<string, `#${string}`> = {}
  // const colorsForLightTheme = schemeCategory10
  const colors = scaleOrdinal(schemeTableau10).range()

  const sortedAuthors = authors.slice().sort((a, b) => sha1(a + colorSeed).localeCompare(sha1(b + colorSeed)))

  for (let i = 0; i < sortedAuthors.length; i++) {
    const author = sortedAuthors[i]
    const existing = predefinedAuthorColors[author]
    if (existing) {
      authorColorMap[author] = existing
      continue
    }
    // const hashed = sha1(author + seed)
    // const color = uniqolor(hashed).color as `#${string}`
    const color = colors[i % colors.length] as `#${string}`
    authorColorMap[author] = color
  }
  return authorColorMap
}

function getMetricCalcs(
  data: RepoData,
  authorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): Record<MetricType, MetricFunction> {
  const maxCommitCount = data.databaseInfo.maxCommitCount
  const minCommitCount = data.databaseInfo.minCommitCount
  const newestEpoch = data.databaseInfo.newestChangeDate
  // TODO: remove when implementing new color scheme, not used, as we use a gradient instead.
  const groupings = lastChangedGroupings(data.databaseInfo.newestChangeDate, data.databaseInfo.oldestChangeDate)
  const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)
  const maxContribCount = data.databaseInfo.maxMinContribCounts.max
  const minContribCount = data.databaseInfo.maxMinContribCounts.min
  const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

  return {
    FILE_TYPE: (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) {
        cache.legend = new Map<string, PointInfo>() satisfies PointLegendData
      }
      //TODO: Ensure that the legend distribution is updated when hiding files, currently if a file type is hidden, it will still be counted in author distribution
      setExtensionColor(blob, cache)
    },

    MOST_COMMITS: (blob: GitBlobObject, cache: MetricCache) => {
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
    },

    LAST_CHANGED: (blob: GitBlobObject, cache: MetricCache) => {
      const domainedScale = scaleSequential(interpolateCool).domain([data.databaseInfo.oldestChangeDate, newestEpoch])
      if (!cache.legend) {
        cache.legend = feature_flags.lastChangedAsGrad
          ? ({
              minValue: data.databaseInfo.oldestChangeDate,
              maxValue: newestEpoch,
              minValueAltFormat: dateFormatShort(data.databaseInfo.oldestChangeDate * 1000),
              maxValueAltFormat: dateFormatShort(newestEpoch * 1000),
              minColor: rgbToHex(domainedScale(data.databaseInfo.oldestChangeDate)),
              maxColor: rgbToHex(domainedScale(newestEpoch))
            } satisfies GradLegendData)
          : ({
              steps: getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.oldestChangeDate) + 1,
              textGenerator: (n) => groupings[n].text,
              colorGenerator: (n) => groupings[n].color,
              offsetStepCalc: (blob) =>
                getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.lastChanged[blob.path] ?? 0) ?? -1
            } satisfies SegmentLegendData)
      }
      const existing = data.databaseInfo.lastChanged[blob.path]
      // const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
      const color = rgbToHex(domainedScale(existing ?? 0))
      if (!color) {
        cache.colormap.set(blob.path, [noEntryColor])
        return
      }
      cache.colormap.set(blob.path, [color])
    },

    TOP_CONTRIBUTOR: (blob: GitBlobObject, cache: MetricCache) => {
      if (!cache.legend) cache.legend = new Map<string, PointInfo>() satisfies PointLegendData
      setDominantAuthorColor(
        authorColors,
        blob,
        cache,
        data.databaseInfo.dominantAuthors,
        dominantAuthorCutoff,
        data.databaseInfo.contribSumPerFile
      )
    },

    MOST_CONTRIBUTIONS: (blob: GitBlobObject, cache: MetricCache) => {
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
    },
    CONTRIBUTORS: ContributorsMetric.metricFunction(data)
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

type MetricFunction = (blob: GitBlobObject, cache: MetricCache) => void

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
              colormap: new Map<string, Array<`#${string}`>>()
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: undefined,
              colormap: new Map<string, Array<`#${string}`>>()
            }
          )
        }
        break
      }
    }
  }
}

export type Metric = {
  name: string
  // description: string;
  icon: string
  getTooltipContent: (obj: GitObject, dbi: DatabaseInfo) => string
  getCategories: (obj: GitObject, dbi: DatabaseInfo) => string
  metricFunction: (data: RepoData) => (blob: GitBlobObject, cache: MetricCache) => void
  // compute: (obj: GitObject) => number | string;
  // categorize: (obj: GitObject) => string;
}
