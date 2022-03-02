import { SetStateAction } from "react"
import styled from "styled-components"
import { useSearch } from "../SearchContext"
import { Details } from "./Details"
import { GlobalInfo } from "./GlobalInfo"
import { Legend } from "./Legend"
import { Options } from "./Options"
import SearchBar from "./SearchBar"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside`
  overflow-y: auto;
`

export function SidePanel() {
  const { setSearchText: onSearchChange } = useSearch()
  return (
    <SidePanelRoot>
      <GlobalInfo />
      <Options />
      <SearchBar
        setSearchText={(searchString: SetStateAction<string>) =>
          onSearchChange(searchString)
        }
      />
      <Spacer />
      <Details />
      <Legend />
    </SidePanelRoot>
  )
}
