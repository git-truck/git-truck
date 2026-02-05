import type { Dispatch, SetStateAction } from "react"
import { createContext, useContext } from "react"
import type { GitObject } from "~/shared/model"

export type SearchResults = Record<string, GitObject>

type Search = {
  searchResults: SearchResults
  hasSearchResults: boolean
  setSearchResults: Dispatch<SetStateAction<SearchResults>>
}

export const SearchContext = createContext<Search | undefined>(undefined)

export function useSearch(): Search {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
