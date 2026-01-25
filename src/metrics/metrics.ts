import type { GitBlobObject, GitTreeObject, RepoData } from "~/shared/model"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import type { PointInfo, PointLegendData } from "~/components/legend/PointLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import { noEntryColor } from "~/const"
import type { LegendType } from "../components/legend/Legend"
import { setExtensionColor } from "./fileExtension"
import { lastChangedGroupings } from "./lastChanged"
import { CommitAmountTranslater } from "./mostCommits"
import { ContribAmountTranslater } from "./mostContribs"
import { setDominantAuthorColor } from "./topContributer"
import { interpolateCool, scaleOrdinal, scaleSequential, schemeTableau10 } from "d3"
import { dateFormatShort, rgbToHex } from "~/shared/util"
import sha1 from "sha1"
import type { SizeMetricType } from "./sizeMetric"

export type MetricsData = [Map<MetricType, MetricCache>, Map<string, string>]

export const Metric = {
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  LAST_CHANGED: "Last changed"
}

export type MetricType = keyof typeof Metric

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number,
  prefersLight: boolean
): MetricsData {
  const authorColors = generateAuthorColors(data.databaseInfo.authors, colorSeed, predefinedAuthorColors, prefersLight)

  return [
    setupMetricsCache(data.databaseInfo.fileTree, getMetricCalcs(data, authorColors, dominantAuthorCutoff)),
    new Map(Object.entries(authorColors))
  ]
}

export const colorMetricDescriptions: Record<MetricType, string> = {
  FILE_TYPE: "Files are colored based on their file extension, which is useful to get an overview of the codebase.",
  MOST_COMMITS: "Files are colored based on the number of commits in the selected time range.",
  LAST_CHANGED: "Files are colored based on how long ago they were changed.",
  TOP_CONTRIBUTOR: "Files are colored based on the top author for each file.",
  MOST_CONTRIBUTIONS: "Files are colored based on how many line changes (additions and deletions) have been made to it."
}

export const sizeMetricDescriptions: Record<SizeMetricType, string> = {
  FILE_SIZE: "Files are sized based on their file size in bytes.",
  EQUAL_SIZE: "All files are sized equally.",
  MOST_COMMITS: "Files are sized based on the number of commits in the selected time range.",
  LAST_CHANGED: "Files are sized based on how long ago they were changed.",
  MOST_CONTRIBS: "Files are sized based on how many line changes (additions and deletions) have been made to it."
}

export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    case "FILE_TYPE":
    case "TOP_CONTRIBUTOR":
      return "POINT"
    case "MOST_COMMITS":
    case "MOST_CONTRIBUTIONS":
    case "LAST_CHANGED":
      return "GRADIENT"
    // case "LAST_CHANGED":
    //   return "SEGMENTS"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export interface MetricCache {
  legend: PointLegendData | GradLegendData | SegmentLegendData | undefined
  colormap: Map<string, `#${string}`>
}

export function generateAuthorColors(
  authors: string[],
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>,
  prefersLight: boolean
): Record<string, `#${string}`> {
  const authorColorMap: Record<string, `#${string}`> = {}
  // const colorsForLightTheme = schemeCategory10
  const colorsForLightTheme = schemeTableau10
  const colorsForDarkTheme = schemeTableau10
  const colors = scaleOrdinal(prefersLight ? colorsForLightTheme : colorsForDarkTheme).range()

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
): [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] {
  const maxCommitCount = data.databaseInfo.maxCommitCount
  const minCommitCount = data.databaseInfo.minCommitCount
  const newestEpoch = data.databaseInfo.newestChangeDate
  // TODO: remove, not used, as we use a gradient instead.
  const groupings = lastChangedGroupings(data.databaseInfo.newestChangeDate, data.databaseInfo.oldestChangeDate)
  const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)
  const maxContribCount = data.databaseInfo.maxMinContribCounts.max
  const minContribCount = data.databaseInfo.maxMinContribCounts.min
  const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

  return [
    [
      "FILE_TYPE",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = new Map<string, PointInfo>() satisfies PointLegendData
        }
        setExtensionColor(blob, cache)
      }
    ],
    [
      "MOST_COMMITS",
      (blob: GitBlobObject, cache: MetricCache) => {
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
    ],
    [
      "LAST_CHANGED",
      (blob: GitBlobObject, cache: MetricCache) => {
        const domainedScale = scaleSequential(interpolateCool).domain([data.databaseInfo.oldestChangeDate, newestEpoch])
        if (!cache.legend) {
          const groupings = [
            { epoch: 31556926 * 4, text: ">4y" },
            { epoch: 31556926 * 2, text: ">2y" },
            { epoch: 31556926, text: ">1y" },
            { epoch: 2629743, text: ">1m" },
            { epoch: 604800, text: ">1w" },
            { epoch: 86400, text: ">1d" },
            { epoch: 0, text: dateFormatShort(newestEpoch * 1000) }
          ].map((group, i, arr) => ({ ...group, color: rgbToHex(interpolateCool(i / arr.length)) as `#${string}` }))

          cache.legend = {
            // steps: getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.oldestChangeDate) + 1,
            // textGenerator: (n) => groupings[n].text,
            // colorGenerator: (n) => rgbToHex(scale(newestEpoch - groupings[n].epoch)),
            // offsetStepCalc: (blob) =>
            //   getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.lastChanged[blob.path] ?? 0) ?? -1
            minValue: data.databaseInfo.oldestChangeDate,
            maxValue: newestEpoch,
            minValueAltFormat: dateFormatShort(data.databaseInfo.oldestChangeDate * 1000),
            maxValueAltFormat: dateFormatShort(newestEpoch * 1000),
            minColor: rgbToHex(domainedScale(data.databaseInfo.oldestChangeDate)),
            maxColor: rgbToHex(domainedScale(newestEpoch))
          } satisfies GradLegendData
        }
        const existing = data.databaseInfo.lastChanged[blob.path]
        // const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
        const color = rgbToHex(domainedScale(existing ?? 0))
        if (!color) {
          cache.colormap.set(blob.path, noEntryColor)
          return
        }
        cache.colormap.set(blob.path, color)
      }
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>() satisfies PointLegendData
        setDominantAuthorColor(
          authorColors,
          blob,
          cache,
          data.databaseInfo.dominantAuthors,
          dominantAuthorCutoff,
          data.databaseInfo.contribSumPerFile
        )
      }
    ],
    [
      "MOST_CONTRIBUTIONS",
      (blob: GitBlobObject, cache: MetricCache) => {
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
    ]
  ]
}

export function setupMetricsCache(
  tree: GitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][]
) {
  const metricCache = new Map<MetricType, MetricCache>()
  setupMetricsCacheRec(tree, metricCalcs, metricCache)
  return metricCache
}

function setupMetricsCacheRec(
  tree: GitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][],
  acc: Map<MetricType, MetricCache>
) {
  for (const child of tree.children) {
    switch (child.type) {
      case "tree":
        setupMetricsCacheRec(child, metricCalcs, acc)
        break
      case "blob":
        for (const [metricType, metricFunc] of metricCalcs) {
          if (!acc.has(metricType))
            acc.set(metricType, {
              legend: undefined,
              colormap: new Map<string, `#${string}`>()
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: undefined,
              colormap: new Map<string, `#${string}`>()
            }
          )
        }
        break
    }
  }
}
