import { SearchField, Box } from "./util"
import styled from "styled-components"
import { Dispatch, SetStateAction, useState } from "react"
import { useDebounce } from "react-use"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

export default function SearchBar(props: {
  setSearchText: Dispatch<SetStateAction<string>>
}) {
  const [value, setValue] = useState("")

  useDebounce(
    () => {
      props.setSearchText(value)
    },
    100,
    [value]
  )

  return (
    <StyledBox>
      <SearchField
        value={value}
        type="text"
        placeholder="Search"
        onChange={(event) => {
          setValue(event.target.value)
        }}
      />
    </StyledBox>
  )
}
