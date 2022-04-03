import { SearchField, Box, Label } from "./util"
import styled from "styled-components"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "@react-aria/utils"
import { HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { useData } from "~/contexts/DataContext"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

function findSearchResults(tree: HydratedGitTreeObject, searchString: string) {
  const searchResults: HydratedGitObject[] = []
  function subTreeSearch(subTree: HydratedGitTreeObject) {
    for (const child of subTree.children) {
      if (child.name.includes(searchString)) searchResults.push(child)
      if (child.type === "tree") subTreeSearch(child)
    }
  }
  subTreeSearch(tree)
  return searchResults
}

export default function SearchBar() {
  const searchFieldRef = useRef<HTMLInputElement>(null)
  const { setSearchText } = useSearch()
  const [value, setValue] = useState("")
  const id = useId()
  const [searchResults, setSearchResults] = useState<HydratedGitObject[]>([])
  const data = useData()

  useDebounce(() => setSearchText(value), 200, [value])

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
        placeholder="Enter terms"
        onChange={(event) => {
          setValue(event.target.value)
          setSearchResults(findSearchResults(data.commit.tree, event.target.value))
        }}
      />
      {searchResults.map(result => {
        return <button key={result.path}>{result.name}</button>
      })}
    </StyledBox>
  )
}
