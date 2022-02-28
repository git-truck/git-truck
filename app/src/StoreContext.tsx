import { createContext, useContext } from "react"
import { HydratedGitBlobObject, ParserData } from "../../parser/src/model"
import { getMetricCalcs, MetricCache, setupMetricsCache } from "./metrics"
import { ChartType } from "./components/BubbleChart"
import { getData } from "./data"
import { MetricType } from "./metrics"

export interface Store {
  data: ParserData
  metricCaches: Map<MetricType, MetricCache>
  metricType: MetricType
  chartType: ChartType
  currentHoveredBlob: HydratedGitBlobObject | null
  currentClickedBlob: HydratedGitBlobObject | null
  setHoveredBlob: (blob: HydratedGitBlobObject | null) => void
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
    metricType: "FILE_EXTENSION",
    chartType: "BUBBLE_CHART",
    currentHoveredBlob: null,
    currentClickedBlob: null,
    setHoveredBlob: () => {
      throw new Error("No setHoveredBlob function provided")
    },
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
