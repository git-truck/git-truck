//@ts-ignore
import gitcolors from "github-colors"
import {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
} from "../../parser/src/model"
import { dateFormat as dateFormatLong, unionAuthors } from "./util"
import distinctColors from "distinct-colors"

export const Metric = {
  FILE_EXTENSION: "File extension",
  HEAT_MAP: "Most commits",
  COLD_MAP: "Last changed",
  DOMINATED: "Dominated files",
  DOMINANTAUTHOR: "Dominant author",
}

export type MetricType = keyof typeof Metric

export function isGradientMetric(metric: MetricType) {
  switch (metric) {
    case "FILE_EXTENSION":
    case "DOMINANTAUTHOR":
    case "DOMINATED":
      return false
    case "COLD_MAP":
    case "HEAT_MAP":
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
  let heatmap = new HeatMapTranslater(commit.minNoCommits, commit.maxNoCommits)
  let coldmap = new ColdMapTranslater(
    commit.oldestLatestChangeEpoch,
    commit.newestLatestChangeEpoch
  )
  let authorColorState = {
    palette: distinctColors({ count: 100 }),
    paletteIndex: 0,
    cache: new Map<string, string>(),
  }
  return [
    [
      "FILE_EXTENSION",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setExtensionColor(blob, cache)
      },
    ],
    [
      "DOMINATED",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
        setDominanceColor(blob, cache)
      },
    ],
    [
      "HEAT_MAP",
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
      "COLD_MAP",
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
      "DOMINANTAUTHOR",
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
  for (let child of tree.children) {
    switch (child.type) {
      case "tree":
        setupMetricsCache(child, metricCalcs, acc)
        break
      case "blob":
        for (let [metricType, metricFunc] of metricCalcs) {
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
  let extension = blob.name.substring(blob.name.lastIndexOf(".") + 1)
  let lookup = gitcolors.ext(extension)
  if (!lookup) {
    cache.colormap.set(blob.path, "grey")
  } else {
    const legend = cache.legend as PointLegendData
    if (legend.has(extension)) {
      legend.get(extension)?.add(1)
    } else {
      legend.set(extension, new PointInfo(lookup.color, 1))
    }
    cache.colormap.set(blob.path, lookup.color)
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
    sorted = Object.entries(unionAuthors(blob)).sort(([k1, v1], [k2, v2]) => {
      if (v1 === 0 || v2 === 0 || !k1 || !k2) throw Error
      if (v1 < v2) return 1
      else if (v1 > v2) return -1
      else return 0
    })
    if (!sorted[0]) throw Error
  } catch {
    return
  }

  let [dom] = sorted[0]
  let colorString: string
  const legend = cache.legend as PointLegendData
  if (acs.cache.has(dom)) {
    colorString = acs.cache.get(dom) ?? "grey"
    legend.get(dom)?.add(1)
  } else {
    let color = acs.palette[acs.paletteIndex++].rgb(true)
    colorString = `rgb(${color[0]},${color[1]},${color[2]})`
    acs.cache.set(dom, colorString)
    legend.set(dom, new PointInfo(colorString, 1))
  }
  cache.colormap.set(blob.path, colorString)
  blob.dominantAuthor = sorted[0]
}

function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache) {
  let creditsum = 0
  for (let [, val] of Object.entries(blob.authors)) {
    creditsum += val
  }

  const legend = cache.legend as PointLegendData

  if (creditsum === 0) {
    legend.set("No credit", new PointInfo("grey", 0))
    cache.colormap.set(blob.path, "grey")
    return
  }

  switch (Object.keys(unionAuthors(blob)).length) {
    case 1:
      legend.set("Dominated", new PointInfo("red", 2))
      cache.colormap.set(blob.path, "red")
      return
    default:
      legend.set("Non-dominated", new PointInfo("cadetblue", 1))
      cache.colormap.set(blob.path, "cadetblue")
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
