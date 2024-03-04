import { createContext, useContext } from "react"
import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { Depth, type DepthType } from "~/metrics/chartDepth"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map"
}

export type ChartType = keyof typeof Chart

export const Hierarchy = {
  NESTED: "Nested",
  FLAT: "Flat"
}

export type HierarchyType = keyof typeof Hierarchy

export type Options = {
  hasLoadedSavedOptions: boolean
  metricType: MetricType
  chartType: ChartType
  depthType: DepthType
  hierarchyType: HierarchyType
  sizeMetric: SizeMetricType
  transitionsEnabled: boolean
  labelsVisible: boolean
  renderCutoff: number
  timeSeriesStart: number
  timeSeriesEnd: number
}

export type OptionsContextType = Options & {
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setSizeMetricType: (sizeMetricType: SizeMetricType) => void
  setTransitionsEnabled: (transitionsEnabled: boolean) => void
  setLabelsVisible: (labelsVisible: boolean) => void
  setDepthType: (depthType: DepthType) => void
  setHierarchyType: (hierarchyType: HierarchyType) => void
  setRenderCutoff: (renderCutoff: number) => void
  setTimeSeriesStart: (timeSeriesStart: number) => void
  setTimeSeriesEnd: (timeSeriesEnd: number) => void
}

export const OptionsContext = createContext<OptionsContextType | undefined>(undefined)

export function useOptions() {
  const context = useContext(OptionsContext)
  if (!context) {
    throw new Error("useOptions must be used within a SearchProvider")
  }
  return context
}

const defaultOptions: Options = {
  hasLoadedSavedOptions: false,
  metricType: Object.keys(Metric)[0] as MetricType,
  chartType: Object.keys(Chart)[0] as ChartType,
  depthType: Object.keys(Depth)[0] as DepthType,
  hierarchyType: Object.keys(Hierarchy)[0] as HierarchyType,
  sizeMetric: Object.keys(SizeMetric)[0] as SizeMetricType,
  transitionsEnabled: true,
  labelsVisible: true,
  renderCutoff: 2,
  timeSeriesStart: 0,
  timeSeriesEnd: Math.floor(Date.now() / 1000)
}

export function getDefaultOptionsContextValue(savedOptions: Partial<Options> = {}): OptionsContextType {
  return {
    ...defaultOptions,
    ...savedOptions,
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
    setSizeMetricType: () => {
      throw new Error("No sizeMetricTypeSetter provided")
    },
    setDepthType: () => {
      throw new Error("No DepthTypeSetter provided")
    },
    setHierarchyType: () => {
      throw new Error("No HiearchyTypeSetter provided")
    },
    setTransitionsEnabled: () => {
      throw new Error("No transitionsEnabledSetter provided")
    },
    setLabelsVisible: () => {
      throw new Error("No labelsVisibleSetter provided")
    },
    setRenderCutoff: () => {
      throw new Error("No renderCutoffSetter provided")
    },
    setTimeSeriesStart: () => {
      throw new Error("No timeSeriesStartSetter provided")
    },
    setTimeSeriesEnd: () => {
      throw new Error("No timeSeriesEndSetter provided")
    }
  }
}
