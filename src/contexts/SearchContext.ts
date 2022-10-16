import type { Dispatch, SetStateAction } from "react"
import { createContext, useContext } from "react"
import type { HydratedGitObject } from "~/analyzer/model"

type Search = {
  searchText: string
  setSearchText: Dispatch<SetStateAction<string>>
  searchResults: HydratedGitObject[]
  setSearchResults: Dispatch<SetStateAction<HydratedGitObject[]>>
}

export const SearchContext = createContext<Search | undefined>(undefined)

export function useSearch(): Search {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}
