import {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
} from "~/analyzer/model"
import { dateFormatLong } from "./util"
import distinctColors from "distinct-colors"
import { getColorFromExtension } from "./extension-color"

export const Metric = {
  FILE_EXTENSION: "File extension",
  MOST_COMMITS: "Most commits",
  LAST_CHANGED: "Time of last change",
  SINGLE_AUTHOR: "Single author",
  TOP_CONTRIBUTOR: "Top contributor",
}

export type MetricType = keyof typeof Metric

export function isGradientMetric(metric: MetricType) {
  switch (metric) {
    case "FILE_EXTENSION":
    case "TOP_CONTRIBUTOR":
    case "SINGLE_AUTHOR":
      return false
    case "LAST_CHANGED":
    case "MOST_COMMITS":
      return true
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
  minColor: string,
  maxColor: string
]

export interface MetricCache {
  legend: PointLegendData | GradLegendData | undefined
  colormap: Map<string, string>
}

export function getMetricCalcs(
  commit: HydratedGitCommitObject
): [
  metricType: MetricType,
  func: (blob: HydratedGitBlobObject, cache: MetricCache) => void
][] {
  const heatmap = new HeatMapTranslater(commit.minNoCommits, commit.maxNoCommits)
  const coldmap = new ColdMapTranslater(
    commit.oldestLatestChangeEpoch,
    commit.newestLatestChangeEpoch
  )
  const authorColorState = {
    palette: distinctColors({ count: 100 }),
    paletteIndex: 0,
    cache: new Map<string, string>(),
  }
  return [
    [
      "FILE_EXTENSION",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = new Map<string, PointInfo>()
          cache.legend.set("Other", new PointInfo("grey", 0))
        }
        setExtensionColor(blob, cache)
      },
    ],
    [
      "SINGLE_AUTHOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominanceColor(blob, cache)
      },
    ],
    [
      "MOST_COMMITS",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            `${commit.minNoCommits}`,
            `${commit.maxNoCommits}`,
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
            dateFormatLong(commit.oldestLatestChangeEpoch),
            dateFormatLong(commit.newestLatestChangeEpoch),
            coldmap.getColor(commit.oldestLatestChangeEpoch),
            coldmap.getColor(commit.newestLatestChangeEpoch),
          ]
        }
        coldmap.setColor(blob, cache)
      },
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominantAuthorColor(authorColorState, blob, cache)
      },
    ],
  ]
}

export function setupMetricsCache(
  tree: HydratedGitTreeObject,
  metricCalcs: [
    metricType: MetricType,
    func: (blob: HydratedGitBlobObject, cache: MetricCache) => void
  ][],
  acc: Map<MetricType, MetricCache>
) {
  for (const child of tree.children) {
    switch (child.type) {
      case "tree":
        setupMetricsCache(child, metricCalcs, acc)
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
  if (color) {
    const legend = cache.legend as PointLegendData
    if (legend.has(extension)) {
      legend.get(extension)?.add(1)
    } else {
      legend.set(extension, new PointInfo(color, 1))
    }
    cache.colormap.set(blob.path, color)
  } else {
    cache.colormap.set(blob.path, "grey")
  }
}

export interface authorColorState {
  palette: chroma.Color[]
  paletteIndex: number
  cache: Map<string, string>
}

function setDominantAuthorColor(
  acs: authorColorState,
  blob: HydratedGitBlobObject,
  cache: MetricCache
) {
  let sorted: [string, number][]
  try {
    if (!blob.unionedAuthors) throw Error
    sorted = Object.entries(blob.unionedAuthors).sort(([k1, v1], [k2, v2]) => {
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
  let colorString: string
  const legend = cache.legend as PointLegendData
  if (acs.cache.has(dom)) {
    colorString = acs.cache.get(dom) ?? "grey"
    legend.get(dom)?.add(1)
  } else {
    const color = acs.palette[acs.paletteIndex++].rgb(true)
    colorString = `rgb(${color[0]},${color[1]},${color[2]})`
    acs.cache.set(dom, colorString)
    legend.set(dom, new PointInfo(colorString, 1))
  }
  cache.colormap.set(blob.path, colorString)
  blob.dominantAuthor = sorted[0]
}

function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache) {
  const dominatedColor = "red"
  const defaultColor = "hsl(210, 38%, 85%)"
  const nocreditColor = "teal"

  let creditsum = 0
  for (const [, val] of Object.entries(blob.authors)) {
    creditsum += val
  }

  const legend = cache.legend as PointLegendData

  if (creditsum === 0) {
    legend.set("No authors", new PointInfo(nocreditColor, 0))
    cache.colormap.set(blob.path, nocreditColor)
    return
  }

  if (!blob.unionedAuthors) throw Error("No unioned authors found")
  switch (Object.keys(blob.unionedAuthors).length) {
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

class SpectrumTranslater {
  readonly scale: number
  readonly offset: number
  readonly target_max: number
  readonly target_min: number

  constructor(
    input_min: number,
    input_max: number,
    target_min: number,
    target_max: number
  ) {
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

class ColdMapTranslater {
  readonly translator: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 90

  constructor(min: number, max: number) {
    this.translator = new SpectrumTranslater(
      min,
      max,
      this.min_lightness,
      this.max_lightness
    )
  }

  getColor(value: number): string {
    return `hsl(240,100%,${this.translator.translate(value)}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(blob.lastChangeEpoch ?? 0))
  }
}

class HeatMapTranslater {
  readonly translator: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translator = new SpectrumTranslater(
      min,
      max,
      this.min_lightness,
      this.max_lightness
    )
  }

  getColor(value: number): string {
    return `hsl(0,100%,${this.translator.inverseTranslate(value)}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(blob.noCommits))
  }
}
