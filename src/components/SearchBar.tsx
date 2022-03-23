import { SearchField, Box, Label } from "./util"
import styled from "styled-components"
import { useEffect, useRef, useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "@react-aria/utils"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

export default function SearchBar() {
  const searchFieldRef = useRef<HTMLInputElement>(null)
  const { setSearchText } = useSearch()
  const [value, setValue] = useState("")
  const id = useId()

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
        }}
      />
    </StyledBox>
  )
}
