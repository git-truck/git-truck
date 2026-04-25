import { createContext, useContext } from "react"
import type { MetricsData } from "~/metrics/metrics"
import type { MetricsHierarchyCache } from "~/metrics/cache"

export type MetricsContextValue = {
  metricsData: MetricsData
  hierarchyCache: MetricsHierarchyCache
}

export const MetricsContext = createContext<MetricsContextValue | undefined>(undefined)

export function useMetrics() {
  const context = useContext(MetricsContext)
  if (!context) {
    throw new Error("useMetrics must be used within a MetricsContext")
  }
  // Backward compatible: return tuple [caches, contributorColorMap]
  return [context.metricsData.caches, context.metricsData.contributorColorMap] as const
}

export function useMetricsHierarchyCache() {
  const context = useContext(MetricsContext)
  if (!context) {
    throw new Error("useMetricsHierarchyCache must be used within a MetricsContext")
  }
  return context.hierarchyCache
}
