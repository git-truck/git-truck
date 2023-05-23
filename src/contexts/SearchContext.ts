import type { Dispatch, SetStateAction } from "react"
import { createContext, useContext } from "react"
import type { HydratedGitObject } from "~/analyzer/model"

export type SearchResults = Record<string, HydratedGitObject>

type Search = {
  searchResults: SearchResults
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
