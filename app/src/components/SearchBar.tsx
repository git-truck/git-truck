import { ChangeEvent } from "react"
import { Box } from "./util"

interface SearchBarProps {
  updateSearchResult(event: ChangeEvent<HTMLInputElement>): void
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Box>
      <input type="text" onChange={props.updateSearchResult} />
    </Box>
  )
}
