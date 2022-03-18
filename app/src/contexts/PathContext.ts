import { createContext, Dispatch, SetStateAction, useContext } from "react"

export interface Path {
  path: string
  setPath: Dispatch<SetStateAction<string>>
}

export const PathContext = createContext<Path | undefined>(undefined)

export function usePath() {
  const context = useContext(PathContext)
  if (!context) {
    throw new Error("useSearch must be used within a PathProvider")
  }
  return context
}
