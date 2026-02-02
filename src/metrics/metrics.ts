import type { GitBlobObject, GitTreeObject } from "~/analyzer/model"
import type { LegendType } from "../components/legend/Legend"
import { setExtensionColor } from "./fileExtension"
import { CommitAmountTranslater } from "./mostCommits"
import { getLastChangedIndex, lastChangedGroupings } from "./lastChanged"
import { setDominantAuthorColor } from "./topContributer"
import type { GradLegendData } from "~/components/legend/GradiantLegend"
import type { SegmentLegendData } from "~/components/legend/SegmentLegend"
import type { PointInfo, PointLegendData } from "~/components/legend/PointLegend"
import uniqolor from "uniqolor"
import type { RepoData } from "~/routes/$repo.$"
import { noEntryColor } from "~/const"
import { createHash } from "node:crypto"
import { ContribAmountTranslater } from "./mostContribs"

// Helper functions for color conversion
function hexToHSL(hex: string): [number, number, number] {
  hex = hex.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): `#${string}` {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2
  let r = 0, g = 0, b = 0
  if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0 }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export type MetricsData = [Map<MetricType, MetricCache>, Map<string, string>]

export const Metric = {
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  LAST_CHANGED: "Last changed",
  SEMANTIC_DATABASE: "Database",
  SEMANTIC_API: "API",
  SEMANTIC_TESTING: "Testing",
  SEMANTIC_EXTERNAL_API: "External API"
}

export type MetricType = keyof typeof Metric

export function createMetricData(
  data: RepoData,
  colorSeed: string | null,
  predefinedAuthorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): MetricsData {
  const authorColors = generateAuthorColors(data.databaseInfo.authors, colorSeed, predefinedAuthorColors)

  return [
    setupMetricsCache(data.databaseInfo.fileTree, getMetricCalcs(data, authorColors, dominantAuthorCutoff)),
    new Map(Object.entries(authorColors))
  ]
}

export function getMetricDescription(metric: MetricType): string {
  switch (metric) {
    case "FILE_TYPE":
      return "Where are different types of files located?"
    case "MOST_COMMITS":
      return "Which files have had the most commits, in the selected time range?"
    case "LAST_CHANGED":
      return "How long ago did the files change?"
    case "TOP_CONTRIBUTOR":
      return "Shows the top author for each file. Adjust the minimum percentage of line changes, that the top author should have, for each file to be colored."
    case "MOST_CONTRIBUTIONS":
      return "How many line changes (additions and deletions) have been made to the file?"
    case "SEMANTIC_DATABASE":
      return "Files related to database models, queries, and ORM operations"
    case "SEMANTIC_API":
      return "API endpoints, route handlers, and HTTP controllers"
    case "SEMANTIC_TESTING":
      return "Test files, specs, and test utilities"
    case "SEMANTIC_EXTERNAL_API":
      return "Files that call external APIs using fetch, requests, axios, etc."
    default:
      throw new Error("Uknown metric type: " + metric)
  }
}

export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    case "FILE_TYPE":
    case "TOP_CONTRIBUTOR":
    case "SEMANTIC_DATABASE":
    case "SEMANTIC_API":
    case "SEMANTIC_TESTING":
    case "SEMANTIC_EXTERNAL_API":
      return "POINT"
    case "MOST_COMMITS":
    case "MOST_CONTRIBUTIONS":
      return "GRADIENT"
    case "LAST_CHANGED":
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
  predefinedAuthorColors: Record<string, `#${string}`>
): Record<string, `#${string}`> {
  const result: Record<string, `#${string}`> = {}
  const seed = colorSeed ?? ""
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i]
    const existing = predefinedAuthorColors[author]
    if (existing) {
      result[author] = existing
      continue
    }
    const hash = createHash("sha1")
    hash.update(author + seed)
    const hashed = hash.digest("hex")
    const color = uniqolor(hashed).color as `#${string}`
    result[author] = color
  }
  return result
}

export function getMetricCalcs(
  data: RepoData,
  authorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] {
  const maxCommitCount = data.databaseInfo.maxCommitCount
  const minCommitCount = data.databaseInfo.minCommitCount
  const newestEpoch = data.databaseInfo.newestChangeDate
  const groupings = lastChangedGroupings(newestEpoch)
  const commitmapper = new CommitAmountTranslater(minCommitCount, maxCommitCount)
  const maxContribCount = data.databaseInfo.maxMinContribCounts.max
  const minContribCount = data.databaseInfo.maxMinContribCounts.min
  const contribmapper = new ContribAmountTranslater(minContribCount, maxContribCount)

  // Load semantic metrics from pre-computed server data
  const semanticMetrics: [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] = []
  if (data.databaseInfo.semanticIntensities) {
    const intensities = data.databaseInfo.semanticIntensities
    const domains = ["Database", "API", "Testing", "ExternalAPI"]
    const colors: Record<string, `#${string}`> = {
      Database: "#ff6b6b",
      API: "#45b7d1",
      Testing: "#95e1d3",
      ExternalAPI: "#fdcb6e"
    }

    for (const domain of domains) {
      const metricType = `SEMANTIC_${domain.toUpperCase()}` as MetricType
      const domainColor = colors[domain]
      const [h, s] = hexToHSL(domainColor)

      semanticMetrics.push([
        metricType,
        (blob: GitBlobObject, cache: MetricCache) => {
          if (!cache.legend) {
            cache.legend = new Map<string, PointInfo>()
          }

          const intensity = intensities[blob.path]?.[domain] || 0

          if (intensity > 5) {
            const lightness = 95 - (intensity / 100) * 55
            const color = hslToHex(h, s, lightness)
            cache.colormap.set(blob.path, color)

            const legend = cache.legend as Map<string, PointInfo>
            const intensityBucket = Math.floor(intensity / 20) * 20
            const key = `${intensityBucket}-${intensityBucket + 20}`
            if (!legend.has(key)) {
              legend.set(key, { color, count: 0 })
            }
            const entry = legend.get(key)!
            entry.count++
          }
        }
      ])
    }
  }

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
        commitmapper.setColor(blob, cache, data.databaseInfo.commitCounts)
      }
    ],
    [
      "LAST_CHANGED",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) {
          cache.legend = [
            getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.oldestChangeDate) + 1,
            (n) => groupings[n].text,
            (n) => groupings[n].color,
            (blob) => getLastChangedIndex(groupings, newestEpoch, data.databaseInfo.lastChanged[blob.path] ?? 0) ?? -1
          ]
        }
        const existing = data.databaseInfo.lastChanged[blob.path]
        const color = existing ? groupings[getLastChangedIndex(groupings, newestEpoch, existing)].color : noEntryColor
        cache.colormap.set(blob.path, color)
      }
    ],
    [
      "TOP_CONTRIBUTOR",
      (blob: GitBlobObject, cache: MetricCache) => {
        if (!cache.legend) cache.legend = new Map<string, PointInfo>()
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
          cache.legend = [
            `${minContribCount}`,
            `${maxContribCount}`,
            undefined,
            undefined,
            contribmapper.getColor(minContribCount),
            contribmapper.getColor(maxContribCount)
          ]
        }
        contribmapper.setColor(blob, cache, data.databaseInfo.contribSumPerFile)
      }
    ],
    ...semanticMetrics
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
