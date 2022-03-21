import { SearchField, Box, Label } from "./util"
import styled from "styled-components"
import { useState } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"
import { useSearch } from "../contexts/SearchContext"
import { useId } from "@react-aria/utils"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

export default function SearchBar() {
  const { setSearchText } = useSearch()
  const [value, setValue] = useState("")
  const id = useId()

  useDebounce(() => setSearchText(value), 200, [value])

  document.body.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "f") {
      event.preventDefault()
      document.getElementById(id)?.focus()
    }
  })

  return (
    <StyledBox>
      <Label htmlFor={id}>Search</Label>
      <Spacer xs />
      <SearchField
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
