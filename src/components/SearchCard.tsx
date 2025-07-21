import { memo, useEffect, useMemo, useRef, useState, useTransition, useId } from "react"
import type { SearchResults } from "~/contexts/SearchContext"
import { useSearch } from "~/contexts/SearchContext"

import type { GitObject, GitTreeObject } from "~/shared/model"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useClickedObject } from "~/contexts/ClickedContext"
import { allExceptLast, getSeparator } from "~/shared/util"
import Icon, { Stack } from "@mdi/react"
import { mdiFolder, mdiFileOutline, mdiMagnify, mdiClose, mdiCircle, mdiFile } from "@mdi/js"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { LegendDot } from "./util"

function findSearchResults(tree: GitTreeObject, searchString: string): SearchResults {
  const searchResults: Record<string, GitObject> = {}
  function subTreeSearch(subTree: GitTreeObject) {
    for (const child of subTree.children) {
      if (child.name.toLowerCase().includes(searchString.toLowerCase()) && searchString) {
        searchResults[child.path] = child
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
  const [searchText, setSearchText] = useState("")
  const { clickedObject, setClickedObject } = useClickedObject()
  const { searchResults, setSearchResults } = useSearch()
  const searchResultsArray = useMemo(() => Object.values(searchResults), [searchResults])
  const id = useId()
  const { databaseInfo } = useData()

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
      <form
        className="w-sidepanel absolute top-0 bottom-0 left-1/2 z-10 flex -translate-x-1/2 flex-col gap-2 transition-[width,translate] not-focus-within:has-placeholder-shown:static not-focus-within:has-placeholder-shown:w-min not-focus-within:has-placeholder-shown:translate-x-0"
        onSubmit={(event) => {
          event.preventDefault()
          setSearchText("")
          event.currentTarget.querySelector("input")?.blur()
        }}
      >
        <button
          className="hidden min-w-max cursor-pointer peer-placeholder-shown:hidden peer-focus:inline"
          type="submit"
        >
          <Icon path={mdiClose} size="1em" className="" />
        </button>
        <label className="input min-h-button h-button max-h-button relative flex w-full min-w-0 cursor-pointer flex-row-reverse items-center gap-2 overflow-hidden not-focus-within:has-placeholder-shown:grow-0 not-focus-within:has-placeholder-shown:gap-0">
          <input
            className="peer w-full grow placeholder-shown:not-focus:w-0 placeholder-shown:not-focus:min-w-0"
            ref={searchFieldRef}
            id={id}
            type="search"
            placeholder="Search for a file or folder..."
            value={searchText}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                setSearchText("")
                setSearchResults({})
                event.currentTarget.blur()
              }
            }}
            onFocus={() => {
              if (clickedObject) {
                setClickedObject(null)
              }
            }}
            onBlur={(event) => {
              if (event.currentTarget.form?.[id].value.trim() === "") {
                setSearchText("")
                setSearchResults({})
              }
            }}
            onChange={(event) => {
              const value = event.target.value
              setSearchText(value)
              startTransition(() => {
                if (value.trim() === "") setSearchResults({})
                setSearchResults(findSearchResults(databaseInfo.fileTree, value))
              })
            }}
          />
          <Icon
            path={mdiMagnify}
            size="1em"
            className="hidden min-w-max peer-placeholder-shown:inline peer-focus:hidden"
          />
          <span className="sr-only">Search</span>
          {isTransitioning || searchText.length > 0 ? (
            <p className="text-secondary-text dark:text-secondary-text-dark absolute right-8 ml-2 text-sm select-none">
              {isTransitioning ? "Searching..." : searchText.length > 0 ? `${searchResultsArray.length} results` : null}
            </p>
          ) : null}
        </label>
        {searchResultsArray.length > 0 ? <SearchResultsList /> : null}
      </form>
    </>
  )
})

const SearchResultsList = memo(function SearchResults() {
  const options = useOptions()
  const { setPath } = usePath()
  const { setClickedObject } = useClickedObject()
  const [metrics] = useMetrics()
  const { searchResults } = useSearch()

  function onClick(object: GitObject) {
    setClickedObject(object)
    if (object.type === "tree") {
      setPath(object.path)
    } else {
      const sep = getSeparator(object.path)
      setPath(allExceptLast(object.path.split(sep)).join(sep))
    }
  }

  return (
    <div className="card bg-tertiary-bg/20 dark:bg-tertiary-bg-dark/20 w-sidepanel relative max-h-1/3 min-h-0 overflow-auto backdrop-blur-lg">
      {Object.values(searchResults).map((result) => (
        <button
          className="flex cursor-pointer items-center justify-start gap-2 text-sm font-bold"
          key={result.path}
          title={result.path}
          type="reset"
          value={result.path}
          onClick={() => onClick(result)}
        >
          {result.type === "tree" ? (
            <Icon path={result.type === "tree" ? mdiFolder : mdiFileOutline} size={0.75} className="shrink-0" />
          ) : (
            <Stack
              size={0.75}
              className="shrink-0"
              color={metrics.get(options.metricType)?.colormap.get(result.path) ?? "grey"}
            >
              <Icon path={mdiFile} size={0.75} className="shrink-0" />
              {/* <Icon path={mdiCircle} size={0.5} className="" /> */}
            </Stack>
            // <LegendDot
            //   dotColor={metrics.get(options.metricType)?.colormap.get(result.path) ?? "grey"}
            //   className="shrink-0"
            // />
          )}
          <span className="text-secondary-text dark:hover:text-primary-text-dark hover:text-primary-text dark:text-secondary-text-dark truncate">
            {result.name}
          </span>
        </button>
      ))}
    </div>
  )
})
