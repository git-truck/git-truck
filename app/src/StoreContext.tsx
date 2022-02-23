import { createContext, useContext } from "react"
import { HydratedGitBlobObject, ParserData } from "../../parser/src/model"
import { ChartType } from "./components/BubbleChart"
import { getData } from "./data"
import { MetricType } from "./metrics"

export interface Store {
  data: ParserData
  metricType: MetricType
  chartType: ChartType
  currentBlob: HydratedGitBlobObject | null
  setCurrentBlob: (blob: HydratedGitBlobObject | null) => void
  setMetricType: (metricType: MetricType) => void
  setChartType: (chartType: ChartType) => void
}

export const StoreContext = createContext<Store>(getDefaultStore())

export function useStore() {
  return useContext(StoreContext)
}

export function getDefaultStore(): Store {
  return {
    data: getData(),
    metricType: "FILE_EXTENSION",
    chartType: "BUBBLE_CHART",
    currentBlob: null,
    setCurrentBlob: () => {
      throw new Error("No currentBlobSetter provided")
    },
    setChartType: () => {
      throw new Error("No chartTypeSetter provided")
    },
    setMetricType: () => {
      throw new Error("No metricTypeSetter provided")
    },
  }
}
