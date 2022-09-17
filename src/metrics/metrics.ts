import distinctColors from "distinct-colors"
import { AnalyzerData, HydratedGitBlobObject, HydratedGitTreeObject } from "~/analyzer/model"
import { LegendType } from "../components/legend/Legend"
import { setExtensionColor } from "./fileExtension"
import { setDominanceColor } from "./singleAuthor"
import { CommitAmountTranslater } from "./mostCommits"
import { getLastChangedIndex, lastChangedGroupings } from "./lastChanged"
import { setDominantAuthorColor } from "./topContributer"
import { TruckFactorTranslater } from "./truckFactor"
import { GradLegendData } from "~/components/legend/GradiantLegend"
import { SegmentLegendData } from "~/components/legend/SegmentLegend"
import { PointInfo, PointLegendData } from "~/components/legend/PointLegend"

export type MetricsData = [
  Record<AuthorshipType, Map<MetricType, MetricCache>>,
  Map<string, string>
]

export const Authorship = {
  HISTORICAL: "Complete history",
  BLAME: "Newest version",
}

export type AuthorshipType = keyof typeof Authorship

export const Metric = {
  FILE_EXTENSION: "File extension",
  MOST_COMMITS: "Number of commits",
  LAST_CHANGED: "Last changed",
  SINGLE_AUTHOR: "Single author",
  TOP_CONTRIBUTOR: "Top contributor",
  TRUCK_FACTOR: "Truck factor",
}

export type MetricType = keyof typeof Metric

export function createMetricData(data: AnalyzerData): MetricsData {
  const authorColors = generateAuthorColors(data.authors)

  return [{
    HISTORICAL: setupMetricsCache(data.commit.tree, getMetricCalcs(data, "HISTORICAL", authorColors)),
    BLAME: setupMetricsCache(data.commit.tree, getMetricCalcs(data, "BLAME", authorColors)),
  },
  authorColors
  ]
}

export function getMetricDescription(metric: MetricType, authorshipType: AuthorshipType): string {
  switch (metric) {
    case "FILE_EXTENSION":
      return "Where are different types of files located?"
    case "MOST_COMMITS":
      return "Which files have had the most commits, throughout the repository's history?"
    case "LAST_CHANGED":
      return "How long ago did the files change?"
    case "SINGLE_AUTHOR":
      return authorshipType === "HISTORICAL"
        ? "Which files are authored by only one person, throughout the repository's history?"
        : "Which files are authored by only one person, in the newest version?"
    case "TOP_CONTRIBUTOR":
      return authorshipType === "HISTORICAL"
        ? "Which person has made the most line-changes to a file, throughout the repository's history?"
        : "Which person has made the most line-changes to a file, in the newest version?"
    case "TRUCK_FACTOR":
        return "How many have contributed to a file?"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export function getMetricLegendType(metric: MetricType) : LegendType {
  switch (metric) {
    case "FILE_EXTENSION":
    case "TOP_CONTRIBUTOR":
    case "SINGLE_AUTHOR":
      return "POINT"
    case "MOST_COMMITS":
      return "GRADIENT"
    case "LAST_CHANGED":
    case "TRUCK_FACTOR":
      return "SEGMENTS"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export interface MetricCache {
  legend: PointLegendData | GradLegendData | SegmentLegendData| undefined
  colormap: Map<string, string>
}

export function generateAuthorColors(authors: string[]): Map<string, string> {
  const authorsMap: Record<string, number> = {}
  for (const author of Object.keys(authors)) authorsMap[author] = 0

  const palette = distinctColors({ count: authors.length })
  let index = 0
  const map = new Map<string, string>()
  for (const author of authors) {
    const color = palette[index++].rgb(true)
    const colorString = `rgb(${color[0]},${color[1]},${color[2]})`
    map.set(author, colorString)
  }
  return map
}

export function getMetricCalcs(
  data: AnalyzerData,
  authorshipType: AuthorshipType,
  authorColors: Map<string, string>,
): [metricType: MetricType, func: (blob: HydratedGitBlobObject, cache: MetricCache) => void][] {
  const commit = data.commit
  const commitmapper = new CommitAmountTranslater(commit.minNoCommits, commit.maxNoCommits)
  const truckmapper = new TruckFactorTranslater(data.authorsUnion.length)

  return [
    [
      "FILE_EXTENSION",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = new Map<string, PointInfo>()
        }
        setExtensionColor(blob, cache)
      },
    ],
    [
      "SINGLE_AUTHOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominanceColor(blob, cache, authorshipType)
      },
    ],
    [
      "MOST_COMMITS",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            `${commit.minNoCommits}`,
            `${commit.maxNoCommits}`,
            undefined,
            undefined,
            commitmapper.getColor(commit.minNoCommits),
            commitmapper.getColor(commit.maxNoCommits),
          ]
        }
        commitmapper.setColor(blob, cache)
      },
    ],
    [
      "LAST_CHANGED",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        const newestEpoch = data.commit.newestLatestChangeEpoch
        const groupings = lastChangedGroupings(newestEpoch)
        if (!cache.legend) {
          cache.legend = [
            getLastChangedIndex(groupings, newestEpoch, data.commit.oldestLatestChangeEpoch)+1,
            (n) => groupings[n].text,
            (n) => groupings[n].color,
            (blob) => getLastChangedIndex(groupings, newestEpoch, blob.lastChangeEpoch ?? 0) ?? -1
          ]
        }
        cache.colormap.set(blob.path, groupings[getLastChangedIndex(groupings, newestEpoch, blob.lastChangeEpoch ?? 0) ?? -1].color)
      },
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!blob.dominantAuthor) blob.dominantAuthor = new Map<AuthorshipType, [string, number]>()
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominantAuthorColor(authorColors, blob, cache, authorshipType)
      },
    ],
    [
      "TRUCK_FACTOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            Math.floor(Math.log2(data.authorsUnion.length)) + 1,
            (n) => `${Math.pow(2,n)}`,
            (n) => `hsl(0,75%,${50 + (n*(40 / (Math.floor(Math.log2(data.authorsUnion.length)) + 1)))}%)`,
            (blob) => Math.floor(Math.log2(Object.entries(blob.unionedAuthors?.HISTORICAL ?? []).length))
          ]
        }
        truckmapper.setColor(blob, cache)
      },
    ],
  ]
}

export function setupMetricsCache(
  tree: HydratedGitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: HydratedGitBlobObject, cache: MetricCache) => void][]
) {
  const metricCache = new Map<MetricType, MetricCache>()
  setupMetricsCacheRec(tree, metricCalcs, metricCache)
  return metricCache
}

function setupMetricsCacheRec(
  tree: HydratedGitTreeObject,
  metricCalcs: [metricType: MetricType, func: (blob: HydratedGitBlobObject, cache: MetricCache) => void][],
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
              colormap: new Map<string, string>(),
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: undefined,
              colormap: new Map<string, string>(),
            }
          )
        }
        break
    }
  }
}
