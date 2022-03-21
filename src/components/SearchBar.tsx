import { SearchField, Box, Label, getSearchbarID } from "./util"
import styled from "styled-components"
import { useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

export default function SearchBar() {
  const { setSearchText } = useSearch()
  const [value, setValue] = useState("")

  useDebounce(() => setSearchText(value), 200, [value])

  return (
    <StyledBox>
      <Label htmlFor={getSearchbarID()}>Search</Label>
      <Spacer xs />
      <SearchField
        id={getSearchbarID()}
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
