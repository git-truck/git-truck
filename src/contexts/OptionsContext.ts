import { createContext, useContext } from "react"
import type { AuthorshipType, MetricType } from "../metrics/metrics"
import { Authorship, Metric } from "../metrics/metrics"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { Depth, type DepthType } from "~/metrics/chartDepth"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
  R3F: "r3f",
  R3F2: "r3f2",
}

export type ChartType = keyof typeof Chart

export const RenderMethod = {
  SVG: "SVG",
  WEBGL: "WebGL"
}

export type RenderMethodType = keyof typeof RenderMethod

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
  authorshipType: AuthorshipType
  transitionsEnabled: boolean
  labelsVisible: boolean
  renderCutoff: number
  renderMethod: RenderMethodType
}

export type OptionsContextType = Options & {
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setSizeMetricType: (sizeMetricType: SizeMetricType) => void
  setAuthorshipType: (authorshipType: AuthorshipType) => void
  setTransitionsEnabled: (transitionsEnabled: boolean) => void
  setLabelsVisible: (labelsVisible: boolean) => void
  setDepthType: (depthType: DepthType) => void
  setHierarchyType: (hierarchyType: HierarchyType) => void
  setRenderCutoff: (renderCutoff: number) => void
  setRenderMethod: (renderMethod: RenderMethodType) => void
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
  authorshipType: Object.keys(Authorship)[0] as AuthorshipType,
  transitionsEnabled: true,
  labelsVisible: true,
  renderCutoff: 2,
  renderMethod: Object.keys(RenderMethod)[0] as RenderMethodType,
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
    setAuthorshipType: () => {
      throw new Error("No AuthorshipTypeSetter provided")
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
    setRenderMethod: () => {
      throw new Error("No renderMethodSetter provided")
    },
    setRenderCutoff: () => {
      throw new Error("No renderCutoffSetter provided")
    }
  }
}
