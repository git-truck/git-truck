import { createContext, useContext } from "react"
import type { MetricsData } from "../metrics/metrics"

export const MetricsContext = createContext<MetricsData | undefined>(undefined)

export function useMetrics() {
  const context = useContext(MetricsContext)
  if (!context) {
    throw new Error("useMetrics must be used within a MetricsContext")
  }
  return context
}
