import { memo, useMemo, useRef, useState, useTransition, useId, createRef, useEffect } from "react"
import type { SearchResults } from "~/contexts/SearchContext"
import { useSearch } from "~/contexts/SearchContext"

import type { GitObject, GitTreeObject } from "~/shared/model"
import { useData } from "~/contexts/DataContext"
import { useClickedObject } from "~/contexts/ClickedContext"
import { getSeparator } from "~/shared/util"
import { Icon } from "~/components/Icon"
import { mdiFolder, mdiFileOutline, mdiMagnify, mdiClose, mdiFile } from "@mdi/js"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { useKey } from "~/hooks"
import { useQueryState } from "nuqs"
import { viewSearchParamsConfig } from "~/routes/view"

function findSearchResults(tree: GitTreeObject, searchString: string): SearchResults {
  const searchResults: Record<string, GitObject> = {}
  function subTreeSearch(subTree: GitTreeObject) {
    for (const child of subTree.children) {
      if (child.path.toLowerCase().includes(searchString.toLowerCase()) && searchString) {
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
  const [zoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)
  const [isTransitioning, startTransition] = useTransition()
  const [searchText, setSearchText] = useState("")
  const { clickedObject, setClickedObject } = useClickedObject()
  const { searchResults, setSearchResults } = useSearch()
  const searchResultsArray = useMemo(() => Object.values(searchResults), [searchResults])
  const id = useId()
  const { databaseInfo } = useData()

  useEffect(() => {
    setSearchResults(searchText.length > 0 ? findSearchResults(databaseInfo.fileTree, searchText) : {})
  }, [searchText, setSearchResults, databaseInfo.fileTree])

  const options = useOptions()
  const [metrics] = useMetrics()

  const resultRefs = Object.keys(searchResults).map(() => createRef<HTMLButtonElement>())

  useKey({ key: "f", ctrlOrMeta: true }, (event) => {
    event.preventDefault()
    searchFieldRef.current?.focus()
  })

  function onClickObject(object: GitObject) {
    setClickedObject(object)
    // if (object.type === "tree") {
    //   setPath(object.path)
    // } else {
    //   const sep = getSeparator(object.path)
    //   setPath(allExceptLast(object.path.split(sep)).join(sep))
    // }
  }

  function focusResultAtIndex(nextIndex: number) {
    resultRefs[nextIndex].current?.focus()
  }

  const items = Object.values(searchResults)
  const zoomedFolderName = zoomPath ? zoomPath.split(getSeparator(zoomPath)).at(-1) : databaseInfo.repo
  const helpText = `Search within ${zoomedFolderName}`
  return (
    <form
      className="w-sidepanel not-focus-within:has-placeholder-shown:w-button pointer-events-none absolute right-0 z-10 flex flex-col gap-2 transition-[left,width,translate] duration-75 **:pointer-events-auto not-focus-within:has-placeholder-shown:static not-focus-within:has-placeholder-shown:translate-x-0"
      onSubmit={(event) => {
        event.preventDefault()
        setSearchText("")
        event.currentTarget.querySelector("input")?.blur()
      }}
    >
      <button className="hidden min-w-max cursor-pointer peer-placeholder-shown:hidden peer-focus:inline" type="submit">
        <Icon path={mdiClose} size="1em" className="" />
      </button>
      <label
        className="input min-h-button h-button max-h-button relative flex w-full min-w-0 cursor-pointer flex-row-reverse items-center gap-2 overflow-hidden not-focus-within:has-placeholder-shown:grow-0 not-focus-within:has-placeholder-shown:gap-0"
        title={helpText}
      >
        <input
          ref={searchFieldRef}
          className="peer w-full grow placeholder-shown:not-focus:w-0 placeholder-shown:not-focus:min-w-0"
          id={id}
          type="search"
          placeholder={helpText}
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
            if (event.key === "ArrowDown") {
              event.preventDefault()
              if (resultRefs.length > 0) {
                focusResultAtIndex(0)
              }
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
      {searchResultsArray.length > 0 ? (
        <div className="card bg-tertiary-bg/10 dark:bg-tertiary-bg-dark/50 w-sidepanel max-h-sidepanel relative min-h-0 overflow-auto backdrop-blur-lg">
          {items.map((object, i) => (
            <button
              ref={resultRefs[i]}
              key={object.path}
              className="flex cursor-pointer items-center justify-start gap-2 text-sm font-bold"
              title={object.path}
              type="reset"
              value={object.path}
              onKeyDown={(event) => {
                const currentIndex = resultRefs.findIndex((ref) => ref.current === event.currentTarget)

                if (event.key === "Escape") {
                  searchFieldRef.current?.focus()
                  searchFieldRef.current?.select()
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  if (resultRefs.length === 0) return
                  const nextIndex = (currentIndex + 1) % resultRefs.length
                  focusResultAtIndex(nextIndex)
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  if (resultRefs.length === 0) return
                  const prevIndex = currentIndex - 1
                  if (prevIndex < 0) {
                    searchFieldRef.current?.focus()
                    searchFieldRef.current?.select()
                    return
                  }
                  focusResultAtIndex(prevIndex)
                }
              }}
              onClick={() => onClickObject(object)}
            >
              {object.type === "tree" ? (
                <Icon path={object.type === "tree" ? mdiFolder : mdiFileOutline} size={0.75} className="shrink-0" />
              ) : (
                <Icon
                  color={metrics.get(options.metricType)?.colormap.get(object.path) ?? "grey"}
                  path={mdiFile}
                  size={0.75}
                  className="shrink-0"
                />
              )}
              <span className="text-secondary-text dark:hover:text-primary-text-dark hover:text-primary-text dark:text-secondary-text-dark truncate">
                {object.path.split(getSeparator(object.path)).slice(1).join("/") ?? object.path}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  )
})
