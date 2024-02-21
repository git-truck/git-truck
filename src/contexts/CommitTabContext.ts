import { createContext, useContext } from "react"

export interface CommitTab {
  startDate: number | null
  setStartDate: (newDate: number | null) => void
  endDate: number | null
  setEndDate: (newDate: number | null) => void
}

export const CommitTabContext = createContext<CommitTab | null>(null)

export function useCommitTab() {
  const context = useContext(CommitTabContext)
  if (!context) {
    throw new Error("useCommitTabContext must be used within Details")
  }
  return context
}

export function getDefaultCommitTab(): CommitTab {
  return {
    startDate: null,
    endDate: null,
    setStartDate: () => {
      throw new Error("No setStartDate provided")
    },
    setEndDate: () => {
      throw new Error("No setEndDate provided")
    }
  }
}
