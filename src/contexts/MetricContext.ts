import { createContext, useContext } from "react"
import { BaseDataType, MetricCache, MetricType } from "../metrics"

export const MetricsContext = createContext<
  Map<BaseDataType, Map<MetricType, MetricCache>> | undefined
>(undefined)

export function useMetrics() {
  const context = useContext(MetricsContext)
  if (!context) {
    throw new Error("useMetrics must be used within a MetricsContext")
  }
  return context
}
