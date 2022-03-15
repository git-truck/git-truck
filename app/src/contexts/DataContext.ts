import { createContext, useContext } from "react"
import { ParserData } from "../../parser/src/model"

export const DataContext = createContext<ParserData | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataContext")
  }
  return context
}
