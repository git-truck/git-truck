import { createContext, useContext } from "react"
import { AnalyzerData } from "~/analyzer/model"

export const DataContext = createContext<AnalyzerData | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataContext")
  }
  return context
}
