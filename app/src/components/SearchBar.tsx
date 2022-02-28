import { Box } from "./util"
import styled from "styled-components"
import { Dispatch, SetStateAction, useState } from "react"

const SearchField = styled.input`
  border: 0;
  width: 100%;
  border-radius: 3px;
`

export default function SearchBar(props: {
  setSearchText: Dispatch<SetStateAction<string>>
}) {
  const [value, setValue] = useState("")
  return (
    <Box>
      <SearchField
        value={value}
        type="text"
        placeholder="Search"
        onChange={(event) => {
          setValue(event.target.value)
          props.setSearchText(event.target.value)
        }}
      />
    </Box>
  )
}
