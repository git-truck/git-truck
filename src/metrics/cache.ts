import type { GitObject, HexColor, RepoData } from "~/shared/model"
import { createMetricDataForNode } from "~/metrics/metrics"
import type { MetricsData } from "~/metrics/metrics"

export type MetricsHierarchyCache = Map<string, MetricsData>

/**
 * Build a hierarchical cache of metrics at different tree levels
 * @param data - Repository data
 * @param colorSeed - Seed for color generation
 * @param predefinedContributorColors - Pre-defined contributor colors
 * @param topContributorCutoff - Cutoff for top contributors
 * @param depthFromRoot - Number of levels to cache below project root (default: 1)
 * @returns Map from node path to MetricsData
 */
export function buildMetricsHierarchyCache(
  data: RepoData,
  colorSeed: string | null,
  predefinedContributorColors: Record<string, HexColor>,
  topContributorCutoff: number,
  depthFromRoot = 1
): MetricsHierarchyCache {
  const cache = new Map<string, MetricsData>()

  // Always cache at project root
  cache.set(
    data.databaseInfo.fileTree.path,
    createMetricDataForNode(
      data,
      data.databaseInfo.fileTree,
      colorSeed,
      predefinedContributorColors,
      topContributorCutoff
    )
  )

  // Build metrics for configurable depth from root
  buildHierarchyCacheRec(
    data.databaseInfo.fileTree,
    0,
    depthFromRoot,
    data,
    colorSeed,
    predefinedContributorColors,
    topContributorCutoff,
    cache
  )

  return cache
}

function buildHierarchyCacheRec(
  node: GitObject,
  currentDepth: number,
  maxDepth: number,
  data: RepoData,
  colorSeed: string | null,
  predefinedContributorColors: Record<string, HexColor>,
  topContributorCutoff: number,
  cache: Map<string, MetricsData>
): void {
  if (currentDepth >= maxDepth || node.type === "blob") {
    return
  }

  for (const child of node.children) {
    if (child.type === "tree") {
      // Avoid duplicate caching
      if (!cache.has(child.path)) {
        cache.set(
          child.path,
          createMetricDataForNode(data, child, colorSeed, predefinedContributorColors, topContributorCutoff)
        )
      }
      buildHierarchyCacheRec(
        child,
        currentDepth + 1,
        maxDepth,
        data,
        colorSeed,
        predefinedContributorColors,
        topContributorCutoff,
        cache
      )
    }
  }
}
