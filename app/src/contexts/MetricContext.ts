import { createContext, useContext } from "react"
import { MetricCache, MetricType } from "../metrics"

export const MetricContext = createContext<
  Map<MetricType, MetricCache> | undefined
>(undefined)

export function useMetricCaches() {
  const context = useContext(MetricContext)
  if (!context) {
    throw new Error("useMetricCache must be used within a MetricContext")
  }
  return context
}
