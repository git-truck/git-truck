//@ts-ignore
import gitcolors from "github-colors"
import {
  HydratedGitBlobObject,
  HydratedGitCommitObject,
  HydratedGitTreeObject,
} from "../../parser/src/model"
import { unionAuthors } from "./util"
import distinctColors from "distinct-colors"

export const Metric = {
  FILE_EXTENSION: "File extension",
  HEAT_MAP: "Heat map",
  COLD_MAP: "Cold map",
  DOMINATED: "Dominated files",
  DOMINANTAUTHOR: "Dominant author",
}

export type MetricType = keyof typeof Metric

export class LegendInfo {
  readonly color: string
  weight: number

  constructor(c: string, w: number) {
    this.color = c
    this.weight = w
  }

  incr() {
    this.weight++
  }
}

export interface MetricCache {
  legend: Map<string, LegendInfo>
  colormap: Map<string, string>
}

export function getMetricCalcs(
  commit: HydratedGitCommitObject
): [
  metricType: MetricType,
  func: (blob: HydratedGitBlobObject, cache: MetricCache) => void
][] {
  let heatmap = new HeatMapTranslater(commit.minNoCommits, commit.maxNoCommits)
  let coldmap = new ColdMapTranslater(commit.minNoCommits, commit.maxNoCommits)
  let authorColorState = {
    palette: distinctColors({ count: 100 }),
    paletteIndex: 0,
    cache: new Map<string, string>(),
  }
  return [
    [
      "FILE_EXTENSION",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        setExtensionColor(blob, cache)
      },
    ],
    [
      "DOMINATED",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        setDominanceColor(blob, cache)
      },
    ],
    [
      "HEAT_MAP",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        heatmap.setColor(blob, cache)
      },
    ],
    [
      "COLD_MAP",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
        coldmap.setColor(blob, cache)
      },
    ],
    [
      "DOMINANTAUTHOR",
      (blob: HydratedGitBlobObject, cache: MetricCache) => {
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
              legend: new Map<string, LegendInfo>(),
              colormap: new Map<string, string>(),
            })
          metricFunc(
            child,
            acc.get(metricType) ?? {
              legend: new Map<string, LegendInfo>(),
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
  if (typeof lookup === "undefined") {
    cache.colormap.set(blob.path, "grey")
  } else {
    if (cache.legend.has(extension)) {
      cache.legend.get(extension)?.incr()
    } else {
      cache.legend.set(extension, new LegendInfo(lookup.color, 1))
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
      if (v1 === 0 || v2 === 0 || k1 === undefined || k2 === undefined)
        throw Error
      if (v1 < v2) return 1
      else if (v1 > v2) return -1
      else return 0
    })
    if (typeof sorted[0] === "undefined") throw Error
  } catch {
    return
  }

  let [dom] = sorted[0]
  let colorString: string
  if (acs.cache.has(dom)) {
    colorString = acs.cache.get(dom) ?? "grey"
    cache.legend.get(dom)?.incr()
  } else {
    let color = acs.palette[acs.paletteIndex++].rgb(true)
    colorString = `rgb(${color[0]},${color[1]},${color[2]})`
    acs.cache.set(dom, colorString)
    cache.legend.set(dom, new LegendInfo(colorString, 1))
  }
  cache.colormap.set(blob.path, colorString)
}

function setDominanceColor(blob: HydratedGitBlobObject, cache: MetricCache) {
  let creditsum = 0
  for (let [, val] of Object.entries(blob.authors)) {
    creditsum += val
  }

  if (creditsum === 0) {
    cache.legend.set("No credit", new LegendInfo("grey", 0))
    cache.colormap.set(blob.path, "grey")
    return
  }

  switch (Object.keys(unionAuthors(blob)).length) {
    case 1:
      cache.legend.set("Dominated", new LegendInfo("red", 2))
      cache.colormap.set(blob.path, "red")
      return
    default:
      cache.legend.set("Non-dominated", new LegendInfo("cadetblue", 1))
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

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(
      blob.path,
      `hsl(240,100%,${this.translator.translate(blob.noCommits)}%)`
    )
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

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(
      blob.path,
      `hsl(0,100%,${this.translator.inverseTranslate(blob.noCommits)}%)`
    )
  }
}
