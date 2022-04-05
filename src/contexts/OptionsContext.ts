import { createContext, useContext } from "react"
import { Authorship, AuthorshipType, Metric, MetricType } from "../metrics"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
}

export type ChartType = keyof typeof Chart

export interface Options {
  metricType: MetricType
  chartType: ChartType
  authorshipType: AuthorshipType
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
  setAuthorshipType: (authorshipType: AuthorshipType) => void
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
    authorshipType: Object.keys(Authorship)[0] as AuthorshipType,
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
    setAuthorshipType: () => {
      throw new Error("No AuthorshipTypeSetter provided")
    }
  }
}
