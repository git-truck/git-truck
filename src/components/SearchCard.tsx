import { memo, useEffect, useRef, useTransition } from "react"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "react"
import type { HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useClickedObject } from "~/contexts/ClickedContext"
import { allExceptLast, getSeparator } from "~/util"
import { Icon } from "@mdi/react"
import { mdiFolder, mdiFileOutline, mdiMagnify } from "@mdi/js"

function findSearchResults(tree: HydratedGitTreeObject, searchString: string) {
  const searchResults: HydratedGitObject[] = []
  function subTreeSearch(subTree: HydratedGitTreeObject) {
    for (const child of subTree.children) {
      if (child.name.toLowerCase().includes(searchString.toLowerCase()) && searchString) {
        searchResults.push(child)
        child.isSearchResult = true
      } else {
        child.isSearchResult = false
      }
      if (child.type === "tree") subTreeSearch(child)
    }
  }
  subTreeSearch(tree)
  return searchResults
}

export const SearchCard = memo(function SearchCard() {
  const searchFieldRef = useRef<HTMLInputElement>(null)
  const [isTransitioning, startTransition] = useTransition()
  const { setSearchText, searchText, searchResults, setSearchResults } = useSearch()
  const id = useId()
  const { analyzerData } = useData()

  useEffect(() => {
    const searchOverride = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "f") {
        event.preventDefault()
        searchFieldRef.current?.focus()
      }
    }
    document.body.addEventListener("keydown", searchOverride)
    return () => {
      document.body.removeEventListener("keydown", searchOverride)
    }
  }, [])

  return (
    <>
      <div className="card sticky top-0 z-10 flex flex-col gap-2">
        <h2 className="card__title justify-start gap-2">
          <Icon path={mdiMagnify} size="1.25em" />
          Search
        </h2>
        <div className="flex gap-2">
          <input
            className="input"
            ref={searchFieldRef}
            id={id}
            type="search"
            placeholder="Search for a file or folder..."
            onChange={(event) => {
              const value = event.target.value
              startTransition(() => {
                setSearchText(value)
                setSearchResults(findSearchResults(analyzerData.commit.tree, value))
              })
            }}
          />
          <button
            className="btn btn--primary"
            onClick={() => {
              if (searchFieldRef.current) {
                searchFieldRef.current.value = ""
                setSearchText("")
                setSearchResults([])
              }
            }}
            disabled={!searchFieldRef.current || searchFieldRef.current.value === ""}
          >
            Clear
          </button>
        </div>
        {isTransitioning || searchText.length > 0 ? (
          <p className="card-p">
            {isTransitioning ? "Searching..." : searchText.length > 0 ? `${searchResults.length} results` : null}
          </p>
        ) : null}
      </div>
      {searchResults.length > 0 ? <SearchResults /> : null}
    </>
  )
})

const SearchResults = memo(function SearchResults() {
  const { setPath } = usePath()
  const { setClickedObject } = useClickedObject()
  const { searchResults } = useSearch()

  function onClick(object: HydratedGitObject) {
    setClickedObject(object)
    if (object.type === "tree") {
      setPath(object.path)
    } else {
      const sep = getSeparator(object.path)
      setPath(allExceptLast(object.path.split(sep)).join(sep))
    }
  }

  return (
    <div className="card relative gap-0">
      {searchResults.map((result) => (
        <button
          className="flex items-center justify-start gap-2 text-sm font-bold opacity-70 hover:opacity-100"
          key={result.path}
          title={result.path}
          value={result.path}
          onClick={() => onClick(result)}
        >
          <Icon path={result.type === "tree" ? mdiFolder : mdiFileOutline} size={0.75} className="shrink-0" />
          <span>{result.name}</span>
        </button>
      ))}
    </div>
  )
})
