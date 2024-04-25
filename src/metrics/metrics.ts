import type { GitBlobObject, GitTreeObject } from "~/analyzer/model"
import type { LegendType } from "../components/legend/Legend"
import { setExtensionColor } from "./fileExtension"
import { setDominanceColor } from "./singleAuthor"
import { CommitAmountTranslater } from "./mostCommits"
import { getLastChangedIndex, lastChangedGroupings } from "./lastChanged"
import { setDominantAuthorColor } from "./topContributer"
import { TruckFactorTranslater } from "./truckFactor"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import type { PointInfo, PointLegendData } from "~/components/legend/PointLegend"
import uniqolor from "uniqolor"
import type { RepoData } from "~/routes/$repo.$"
import { noEntryColor } from "~/const"
import { createHash } from "node:crypto"
import { ContribAmountTranslater } from "./mostContribs"

export type MetricsData = [Map<MetricType, MetricCache>, Map<string, string>]

export const Metric = {
  FILE_TYPE: "File type",
  TRUCK_FACTOR: "Truck factor",
  TOP_CONTRIBUTOR: "Top contributor",
  MOST_COMMITS: "Commits",
  // MOST_CONTRIBUTIONS: "Contributions",
  SINGLE_AUTHOR: "Single author",
  LAST_CHANGED: "Last changed"
}

export type MetricType = keyof typeof Metric

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedAuthorColors: Map<string, `#${string}`>
): MetricsData {
  const authorColors = generateAuthorColors(data.repodata2.authors, colorSeed, predefinedAuthorColors)

  return [setupMetricsCache(data.repodata2.fileTree, getMetricCalcs(data, authorColors)), authorColors]
}

export function getMetricDescription(metric: MetricType): string {
  switch (metric) {
    case "FILE_TYPE":
      return "Where are different types of files located?"
    case "MOST_COMMITS":
      return "Which files have had the most commits, in the selected time range?"
    case "LAST_CHANGED":
      return "How long ago did the files change?"
    case "SINGLE_AUTHOR":
      return "Which files are authored by only one person, in the selected time range?"
    case "TOP_CONTRIBUTOR":
      return "Which person has made the most line-changes to a file, in the selected time range?"
    case "TRUCK_FACTOR":
      return "How many authors have contributed to a given file?"
    // case "MOST_CONTRIBUTIONS":
    //   return "How many contributions have been made to the file?"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    case "FILE_TYPE":
    case "TOP_CONTRIBUTOR":
    case "SINGLE_AUTHOR":
      return "POINT"
    case "MOST_COMMITS":
    // case "MOST_CONTRIBUTIONS":
      return "GRADIENT"
    case "LAST_CHANGED":
    case "TRUCK_FACTOR":
      return "SEGMENTS"
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
  predefinedAuthorColors: Map<string, `#${string}`>
): Map<string, `#${string}`> {
  const map = new Map<string, `#${string}`>()
  const seed = colorSeed ?? ""
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i]
    const existing = predefinedAuthorColors.get(author)
    if (existing) {
      map.set(author, existing)
      continue
    }
    const hash = createHash("sha1")
    hash.update(author + seed)
    const hashed = hash.digest("hex")
    const color = uniqolor(hashed).color as `#${string}`
    map.set(author, color)
  }
  return map
}

export function getMetricCalcs(
  data: RepoData,
  authorColors: Map<string, `#${string}`>
): [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] {
  const maxCommitCount = data.repodata2.maxCommitCount
  const minCommitCount = data.repodata2.minCommitCount
  const newestEpoch = data.repodata2.newestChangeDate
  const groupings = lastChangedGroupings(newestEpoch)
  const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)
  const truckmapper = new TruckFactorTranslater(data.repodata2.authors.length)
  const maxContribCount = data.repodata2.maxMinContribCounts.max
  const minContribCount = data.repodata2.maxMinContribCounts.min
  const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

  return [
    [
      "FILE_TYPE",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = new Map<string, PointInfo>()
        }
        setExtensionColor(blob, cache)
      }
    ],
    [
      "SINGLE_AUTHOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominanceColor(blob, cache, authorColors, data.repodata2.dominantAuthors, data.repodata2.authorCounts)
      }
    ],
    [
      "MOST_COMMITS",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            `${minCommitCount}`,
            `${maxCommitCount}`,
            undefined,
            undefined,
            commitmapper.getColor(minCommitCount),
            commitmapper.getColor(maxCommitCount)
          ]
        }
        commitmapper.setColor(blob, cache, data.repodata2.commitCounts)
      }
    ],
    [
      "LAST_CHANGED",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            getLastChangedIndex(groupings, newestEpoch, data.repodata2.oldestChangeDate) + 1,
            (n) => groupings[n].text,
            (n) => groupings[n].color,
            (blob) =>
              getLastChangedIndex(
                groupings,
                newestEpoch,
                data.repodata2.lastChanged.get(blob.path) ?? 0
              ) ?? -1
          ]
        }
        const existing = data.repodata2.lastChanged.get(blob.path)
        const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
        cache.colormap.set(blob.path, color)
      }
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominantAuthorColor(authorColors, blob, cache, data.repodata2.dominantAuthors)
      }
    ],
    [
      "TRUCK_FACTOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            Math.floor(Math.log2(data.repodata2.authors.length)) + 1,
            (n) => `${Math.pow(2, n)}`,
            (n) => `hsl(0,75%,${50 + n * (40 / (Math.floor(Math.log2(data.repodata2.authors.length)) + 1))}%)`,
            (blob) => Math.floor(Math.log2(data.repodata2.authorCounts.get(blob.path) ?? 0))
          ]
        }
        truckmapper.setColor(blob, cache, data.repodata2.authorCounts)
      }
    ],
    // [
    //   "MOST_CONTRIBUTIONS",
    //   (blob: GitBlobObject, cache: MetricCache) => {
    //     if (!cache.legend) {
    //       cache.legend = [
    //         `${minContribCount}`,
    //         `${maxContribCount}`,
    //         undefined,
    //         undefined,
    //         contribmapper.getColor(minContribCount),
    //         contribmapper.getColor(maxContribCount)
    //       ]
    //     }
    //     contribmapper.setColor(blob, cache, data.repodata2.contribSumPerFile)
    //   }
    // ]
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
