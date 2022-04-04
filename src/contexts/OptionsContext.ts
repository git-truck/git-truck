import { createContext, useContext } from "react"
import { BaseData, BaseDataType, Metric, MetricType } from "../metrics"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
}

export type ChartType = keyof typeof Chart

export interface Options {
  metricType: MetricType
  chartType: ChartType
  baseDataType: BaseDataType
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setBaseDataType: (baseDataType: BaseDataType) => void
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
    baseDataType: Object.keys(BaseData)[0] as BaseDataType,
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
    setBaseDataType: () => {
      throw new Error("No baseDataTypeSetter provided")
    }
  }
}
