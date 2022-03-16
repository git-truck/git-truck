import { createContext, useContext } from "react"

export interface Folder {
  path: string
  setPath: (path: string) => void
}

export const FolderContext = createContext<Folder | undefined>(undefined)

export function useFolder() {
  const context = useContext(FolderContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
