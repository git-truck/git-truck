import { createContext, useContext } from "react"
import type { RepoData } from "~/shared/model"

export const DataContext = createContext<RepoData | undefined>(undefined)

function getReadyData(context: RepoData | undefined) {
  if (!context) {
    return null
  }
  if (context.repo.status !== "Success") {
    throw new Error(`Repo is not analyzed, it is in status: ${context.repo.status}`)
  }
  const { objectPathMap } = context.databaseInfo
  if (!objectPathMap) {
    throw new Error("objectPathMap must be added before reading from DataContext")
  }

  return {
    ...context,
    repo: context.repo,
    databaseInfo: {
      ...context.databaseInfo,
      objectPathMap
    }
  }
}

export function useData() {
  const context = getReadyData(useContext(DataContext))
  if (!context) {
    throw new Error("useData must be used within a DataContext.Provider")
  }

  return context
}

export function useDataNullable() {
  return getReadyData(useContext(DataContext))
}
