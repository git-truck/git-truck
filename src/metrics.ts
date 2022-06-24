import distinctColors from "distinct-colors"
import { AnalyzerData, HydratedGitBlobObject, HydratedGitTreeObject } from "~/analyzer/model"
import { makeDupeMap, unionAuthors } from "./authorUnionUtil.server"
import { getColorFromExtension } from "./extension-color"
import { dateFormatLong, dateFormatRelative } from "./util"
import { LegendType } from "./components/Legend"

export type MetricsData = Record<AuthorshipType, Map<MetricType, MetricCache>>

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

export function createMetricData(data: AnalyzerData, fullUnion: string[]): MetricsData {
  const authorColors = generateAuthorColors(fullUnion)

  return {
    HISTORICAL: setupMetricsCache(data.commit.tree, getMetricCalcs(data, "HISTORICAL", authorColors, fullUnion)),
    BLAME: setupMetricsCache(data.commit.tree, getMetricCalcs(data, "BLAME", authorColors, fullUnion)),
  }
}

export function getMetricDescription(metric: MetricType, authorshipType: AuthorshipType): string {
  switch (metric) {
    case "FILE_EXTENSION":
      return "Where are different types of files located?"
    case "MOST_COMMITS":
      return "Which files have had the most commits, throughout the repository's history?"
    case "LAST_CHANGED":
      return "Where are the most recent or least recent commits made?"
    case "SINGLE_AUTHOR":
      return authorshipType === "HISTORICAL"
        ? "Which files are authored by only one person, throughout the repository's history?"
        : "Which files are authored by only one person, in the newest version?"
    case "TOP_CONTRIBUTOR":
      return authorshipType === "HISTORICAL"
        ? "Which person has made the most line-changes to a file, throughout the repository's history?"
        : "Which person has made the most line-changes to a file, in the newest version?"
    case "TRUCK_FACTOR":
        return "WIP"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export function isGradientMetric(metric: MetricType) {
  switch (metric) {
    case "FILE_EXTENSION":
    case "TOP_CONTRIBUTOR":
    case "SINGLE_AUTHOR":
      return false
    case "LAST_CHANGED":
    case "MOST_COMMITS":
    case "TRUCK_FACTOR":
      return true
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
    case "LAST_CHANGED":
    case "MOST_COMMITS":
      return "GRADIENT"
    case "TRUCK_FACTOR":
      return "LOG_GRADIENT"
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export class PointInfo {
  constructor(public readonly color: string, public weight: number) {}

  add(value: number) {
    this.weight += value
  }
}

export type PointLegendData = Map<string, PointInfo>
export type GradLegendData = [
  minValue: string,
  maxValue: string,
  minValueAltFormat: string | undefined,
  maxValueAltFormat: string | undefined,
  minColor: string,
  maxColor: string
]
export type LogGradLegendData = [
  steps: number
]

export interface MetricCache {
  legend: PointLegendData | GradLegendData | LogGradLegendData| undefined
  colormap: Map<string, string>
}

export function generateAuthorColors(authors: string[]): Map<string, string> {
  const authorsMap: Record<string, number> = {}
  for (const author of authors) authorsMap[author] = 0

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
  fullUnion: string[],
): [metricType: MetricType, func: (blob: HydratedGitBlobObject, cache: MetricCache) => void][] {
  const commit = data.commit
  const heatmap = new HeatMapTranslater(commit.minNoCommits, commit.maxNoCommits)
  const coldmap = new ColdMapTranslater(commit.oldestLatestChangeEpoch, commit.newestLatestChangeEpoch)
  const agemap = new AgeColorMapper()
  const truckmap = new TruckFactorTranslater(fullUnion.length)

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
            heatmap.getColor(commit.minNoCommits),
            heatmap.getColor(commit.maxNoCommits),
          ]
        }
        heatmap.setColor(blob, cache)
      },
    ],
    [
      "LAST_CHANGED",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            dateFormatRelative(commit.oldestLatestChangeEpoch),
            dateFormatRelative(commit.newestLatestChangeEpoch),
            dateFormatLong(commit.oldestLatestChangeEpoch),
            dateFormatLong(commit.newestLatestChangeEpoch),
            coldmap.getColor(commit.oldestLatestChangeEpoch),
            coldmap.getColor(commit.newestLatestChangeEpoch),
          ]
        }
        agemap.setColor(blob, cache)
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
            Math.floor(Math.log2(fullUnion.length)) + 1
          ]
        }
        truckmap.setColor(blob, cache)
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

function setExtensionColor(blob: HydratedGitBlobObject, cache: MetricCache) {
  const extension = blob.name.substring(blob.name.lastIndexOf(".") + 1)
  const color = getColorFromExtension(extension)
  const legend = cache.legend as PointLegendData
  if (color) {
    if (legend.has(extension)) {
      legend.get(extension)?.add(1)
    } else {
      legend.set(extension, new PointInfo(color, 1))
    }
    cache.colormap.set(blob.path, color)
  } else {
    if (!legend.has("Other")) legend.set("Other", new PointInfo("grey", 0))
    cache.colormap.set(blob.path, "grey")
  }
}

function setDominantAuthorColor(
  authorColors: Map<string, string>,
  blob: HydratedGitBlobObject,
  cache: MetricCache,
  authorshipType: AuthorshipType
) {
  const authorUnion = blob.unionedAuthors?.[authorshipType]
  let sorted: [string, number][]
  try {
    if (!authorUnion) throw Error
    sorted = Object.entries(authorUnion).sort(([k1, v1], [k2, v2]) => {
      if (v1 === 0 || v2 === 0 || !k1 || !k2) throw Error
      if (v1 < v2) return 1
      else if (v1 > v2) return -1
      else return 0
    })
    if (!sorted[0]) throw Error
  } catch {
    return
  }

  const [dom] = sorted[0]
  const legend = cache.legend as PointLegendData
  const color = authorColors.get(dom) ?? "grey"

  cache.colormap.set(blob.path, color)
  blob.dominantAuthor?.set(authorshipType, sorted[0])

  if (legend.has(dom)) {
    legend.get(dom)?.add(1)
    return
  }
  legend.set(dom, new PointInfo(color, 1))
}

function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache, authorshipType: AuthorshipType) {
  const dominatedColor = "red"
  const defaultColor = "hsl(210, 38%, 85%)"
  const nocreditColor = "teal"

  const authorUnion = blob.unionedAuthors?.[authorshipType] ?? {}

  let creditsum = 0
  for (const [, val] of Object.entries(authorUnion)) {
    creditsum += val
  }

  const legend = cache.legend as PointLegendData

  if (creditsum === 0) {
    legend.set("No authors", new PointInfo(nocreditColor, 0))
    cache.colormap.set(blob.path, nocreditColor)
    return
  }

  if (!authorUnion) throw Error("No unioned authors found")
  switch (Object.keys(authorUnion).length) {
    case 1:
      legend.set("Single author", new PointInfo(dominatedColor, 2))
      cache.colormap.set(blob.path, dominatedColor)
      return
    default:
      legend.set("Multiple authors", new PointInfo(defaultColor, 1))
      cache.colormap.set(blob.path, defaultColor)
      return
  }
}

class AgeColorMapper {

  getColor(input: number) {
    let diff = ((Date.now()/1000) - input)

    if (diff >= 31556926) return "#08519c"
    else if (diff < 31556926 && diff >= 2629743) return "#3182bd"
    else if (diff < 2629743 && diff >= 604800) return "#6baed6"
    else if (diff < 604800 && diff >= 172800) return "#9ecae1"
    else if (diff < 172800 && diff >= 86400) return "#c6dbef"
    else if (diff < 86400) return "#eff3ff"
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(blob.lastChangeEpoch ?? 0) ?? "grey")
  }
}

class SpectrumTranslater {
  readonly scale: number
  readonly offset: number
  readonly target_max: number
  readonly target_min: number

  constructor(input_min: number, input_max: number, target_min: number, target_max: number) {
    this.scale = (target_max - target_min) / (input_max - input_min)
    this.offset = input_min * this.scale - target_min
    this.target_max = target_max
    this.target_min = target_min
  }

  translate(input: number) {
    return input * this.scale - this.offset
  }

  inverseTranslate(input: number) {
    return this.target_max - this.translate(input) + this.target_min
  }
}

class TruckFactorTranslater {
  private readonly min_lightness = 50
  private readonly max_lighness = 90
  private readonly step: number

  constructor(author_count: number) {
    this.step = (this.max_lighness - this.min_lightness) / Math.floor(Math.log2(author_count))
  }

  getColor(value: number) {
    const level = Math.floor(Math.log2(value))
    return `hsl(0,75%,${this.min_lightness + (level * this.step)}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(Object.entries(blob.unionedAuthors?.HISTORICAL ?? []).length))
  }
}

class ColdMapTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 90

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): string {
    return `hsl(240,100%,${this.translater.inverseTranslate(value)}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(blob.lastChangeEpoch ?? 0))
  }
}

class HeatMapTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): string {
    return `hsl(20,100%,${this.translater.inverseTranslate(value)}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(blob.noCommits))
  }
}
