import styled from "styled-components"
import { Details } from "./Details"
import { GlobalInfo } from "./GlobalInfo"
import { Legend } from "./Legend"
import { Options } from "./Options"
import SearchBar from "./SearchBar"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside`
  overflow-y: auto;
  overflow-x: hidden;
`

export function SidePanel() {
  return (
    <SidePanelRoot>
      <GlobalInfo />
      <Options />
      <SearchBar />
      <Spacer />
      <Details />
      <Legend />
    </SidePanelRoot>
  )
}
