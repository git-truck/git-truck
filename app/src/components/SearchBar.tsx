import { SearchField, Box, Label } from "./util"
import styled from "styled-components"
import { Dispatch, SetStateAction, useId, useState, useTransition } from "react"
import { useDebounce } from "react-use"
import { Spacer } from "./Spacer"

const StyledBox = styled(Box)`
  display: flex;
  flex-direction: column;
`

export default function SearchBar(props: {
  setSearchText: Dispatch<SetStateAction<string>>
}) {
  const [value, setValue] = useState("")
  const id = useId()
  const [, startTransition] = useTransition()

  useDebounce(
    () => {
      startTransition(() => {
        props.setSearchText(value)
      })
    },
    // 1,
    100,
    [value]
  )

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
