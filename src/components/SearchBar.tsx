import { SearchField, Box, Label, StyledP, SearchResultButton, SearchResultSpan, LightFontAwesomeIcon } from "./util"
import styled from "styled-components"
import { Fragment, useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "@react-aria/utils"
import { GitObject, GitTreeObject } from "~/analyzer/model"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useClickedObject } from "~/contexts/ClickedContext"
import { allExceptLast, getSeparator } from "~/util"
import { faFolderOpen, faFile } from "@fortawesome/free-solid-svg-icons"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

function findSearchResults(tree: GitTreeObject, searchString: string) {
  const searchResults: GitObject[] = []
  function subTreeSearch(subTree: GitTreeObject) {
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
  const data = useData()
  const { setPath } = usePath()
  const { setClickedObject } = useClickedObject()

  function onClick(object: GitObject) {
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
    setSearchResults(findSearchResults(data.commit.tree, value))
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
      <Label htmlFor={id}>Search</Label>
      <Spacer xs />
      <SearchField
        ref={searchFieldRef}
        id={id}
        value={value}
        type="search"
        placeholder="Enter file or folder name"
        onChange={(event) => {
          setValue(event.target.value)
        }}
      />
      {searchText.length > 0 ? <StyledP>{searchResults.length} results</StyledP> : null}
      {searchResults.map((result) => {
        return (
          <Fragment key={result.path}>
            <SearchResultButton title={result.path} value={result.path} onClick={() => onClick(result)}>
              <SearchResultSpan>
                <LightFontAwesomeIcon icon={result.type === "tree" ? faFolderOpen : faFile} /> {result.name}
              </SearchResultSpan>
            </SearchResultButton>
            <Spacer xs />
          </Fragment>
        )
      })}
    </StyledBox>
  )
}
