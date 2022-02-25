import { createContext, useContext } from "react"
import { HydratedGitBlobObject, ParserData } from "../../parser/src/model"
import { getData } from "./data"
import { getMetricCalcs, Metric, MetricCache, MetricType, setupMetricsCache } from "./metrics"

export const Chart = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
}

export type ChartType = keyof typeof Chart

export interface Store {
  data: ParserData
  metricCaches: Map<MetricType, MetricCache>
  metricType: MetricType
  chartType: ChartType
  clickedBlob: HydratedGitBlobObject | null
  setClickedBlob: (blob: HydratedGitBlobObject | null) => void
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
}

export const StoreContext = createContext<Store>(getDefaultStore())

export function useStore() {
  return useContext(StoreContext)
}

export function getDefaultStore(): Store {
  let d = getData()
  let mc = new Map<MetricType, MetricCache>()
  setupMetricsCache(d.commit.tree, getMetricCalcs(d.commit), mc)

  return {
    data: d,
    metricCaches: mc,
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
