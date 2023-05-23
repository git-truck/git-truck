import type { Dispatch, SetStateAction } from "react"
import { createContext, useContext } from "react"

export interface Path {
  path: string
  setPath: Dispatch<SetStateAction<string>>
}

export const PathContext = createContext<Path | undefined>(undefined)

export function usePath() {
  const context = useContext(PathContext)
  if (!context) {
    throw new Error("useOptions must be used within a PathProvider")
  }
  return context
}
