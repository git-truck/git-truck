import { SearchField, Box } from "./util"
import styled from "styled-components"
import { Dispatch, SetStateAction, useState } from "react"

const StyledBox = styled(Box)`
  display: flex;
`

export default function SearchBar(props: {
  setSearchText: Dispatch<SetStateAction<string>>
}) {
  const [value, setValue] = useState("")
  return (
    <StyledBox>
      <SearchField
        value={value}
        type="text"
        placeholder="Search"
        onChange={(event) => {
          setValue(event.target.value)
          props.setSearchText(event.target.value)
        }}
      />
    </StyledBox>
  )
}
