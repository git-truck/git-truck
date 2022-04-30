import { SearchField, Box, Label, BoxP, SearchResultButton, BoxSubTitle } from "./util"
import styled from "styled-components"
import { Fragment, useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "@react-aria/utils"
import { HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useClickedObject } from "~/contexts/ClickedContext"
import { allExceptLast, getSeparator } from "~/util"
import {
  Folder as FolderIcon,
  TextSnippet as FileIcon
} from "@styled-icons/material"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

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

export default function SearchBar() {
  const searchFieldRef = useRef<HTMLInputElement>(null)
  const { searchText, setSearchText, searchResults, setSearchResults } = useSearch()
  const [value, setValue] = useState("")
  const id = useId()
  const { analyzerData } = useData()
  const { setPath } = usePath()
  const { setClickedObject } = useClickedObject()

  function onClick(object: HydratedGitObject) {
    setClickedObject(object)
    if (object.type === "tree") {
      setPath(object.path)
    } else {
      const sep = getSeparator(object.path)
      setPath(allExceptLast(object.path.split(sep)).join(sep))
    }
  }

  function debounceUpdate() {
    setSearchText(value)
    setSearchResults(findSearchResults(analyzerData.commit.tree, value))
  }

  useDebounce(() => debounceUpdate(), 200, [value])

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
    <StyledBox>
      <SearchField
        ref={searchFieldRef}
        id={id}
        value={value}
        type="search"
        placeholder="Search for a file or folder..."
        onChange={(event) => {
          setValue(event.target.value)
        }}
      />
      {searchText.length > 0 ? <BoxP>{searchResults.length} results</BoxP> : null}
      {searchResults.map((result) => {
        return (
          <Fragment key={result.path}>
            <SearchResultButton title={result.path} value={result.path} onClick={() => onClick(result)}>
              {
                (result.type === "tree")
                ? <FolderIcon display="inline-block" height="1rem" />
                : <FileIcon display="inline-block" height="1rem" />
              }
              <span>{result.name}</span>
            </SearchResultButton>
            <Spacer xs />
          </Fragment>
        )
      })}
    </StyledBox>
  )
}
