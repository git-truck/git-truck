import { createContext, useContext } from "react"
import { HydratedGitBlobObject } from "../../../parser/src/model"
import { Metric, MetricType } from "../metrics"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
}

export type ChartType = keyof typeof Chart

export interface Options {
  metricType: MetricType
  chartType: ChartType
  clickedBlob: HydratedGitBlobObject | null
  setClickedBlob: (blob: HydratedGitBlobObject | null) => void
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
}

export const OptionsContext = createContext<Options | undefined>(undefined)

export function useOptions() {
  const context = useContext(OptionsContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}

export function getDefaultOptions() {
  return {
    metricType: Object.keys(Metric)[0] as MetricType,
    chartType: Object.keys(Chart)[0] as ChartType,
    clickedBlob: null,
    setClickedBlob: () => {
      throw new Error("No setClickedBlob function provided")
    },
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
  }
}
