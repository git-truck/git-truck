import { createContext, useContext } from "react"
import type { MetricType } from "~/metrics/metrics"
import { Metric } from "~/metrics/metrics"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
  PARTITION: "Partition"
} as const

export type ChartType = keyof typeof Chart

export const Hierarchy = {
  NESTED: "Nested",
  FLAT: "Flat"
} as const

export type HierarchyType = keyof typeof Hierarchy

export type Options = {
  hasLoadedSavedOptions: boolean
  metricType: MetricType
  chartType: ChartType
  hierarchyType: HierarchyType
  commitSearch: string
  sizeMetric: SizeMetricType
  transitionsEnabled: boolean
  labelsVisible: boolean
  renderCutOff: number
  showFilesWithoutChanges: boolean
  dominantAuthorCutoff: number
  linkMetricAndSizeMetric: boolean
  /**
   * When searching, hide files that do not match the search query
   */
  showOnlySearchMatches: boolean
}

export type OptionsContextType = Options & {
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setSizeMetricType: (sizeMetricType: SizeMetricType) => void
  setTransitionsEnabled: (transitionsEnabled: boolean) => void
  setLabelsVisible: (labelsVisible: boolean) => void
  setHierarchyType: (hierarchyType: HierarchyType) => void
  setCommitSearch: (commitSearch: string) => void
  setRenderCutoff: (renderCutoff: number) => void
  setShowFilesWithoutChanges: (showFilesWithoutChanges: boolean) => void
  setDominantAuthorCutoff: (dominantAuthorCutoff: number) => void
  setLinkMetricAndSizeMetric: (link: boolean) => void
  setShowOnlySearchMatches: (showOnlySearchMatches: boolean) => void
}

export const OptionsContext = createContext<OptionsContextType | undefined>(undefined)

export function useOptions() {
  const context = useContext(OptionsContext)
  if (!context) {
    throw new Error("useOptions must be used within an OptionsProvider")
  }
  return context
}

const defaultOptions: Options = {
  hasLoadedSavedOptions: false,
  metricType: Object.keys(Metric)[0] as MetricType,
  chartType: Object.keys(Chart)[0] as ChartType,
  hierarchyType: Object.keys(Hierarchy)[0] as HierarchyType,
  sizeMetric: Object.keys(SizeMetric)[0] as SizeMetricType,
  commitSearch: "",
  transitionsEnabled: true,
  labelsVisible: true,
  renderCutOff: 2,
  showFilesWithoutChanges: true,
  dominantAuthorCutoff: 0,
  linkMetricAndSizeMetric: false,
  showOnlySearchMatches: false
}

export const getDefaultOptionsContextValue = (): Options => defaultOptions
