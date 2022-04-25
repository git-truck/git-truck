import { createContext, useContext } from "react"
import { RepoData } from "~/routes/$repo.$"

export const DataContext = createContext<RepoData | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataContext")
  }
  return context
}
