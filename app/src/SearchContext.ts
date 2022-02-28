import { createContext, Dispatch, SetStateAction, useContext } from "react"

type Search = {
  searchText: string
  setSearchText: Dispatch<SetStateAction<string>>
}

export const SearchContext = createContext<Search | undefined>(undefined)

export function useSearch(): Search {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
