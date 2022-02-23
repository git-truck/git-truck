import styled from "styled-components"
import { Details } from "./Details"
import { GlobalInfo } from "./GlobalInfo"
import { Legend } from "./Legend"
import { Options } from "./Options"
import { SearchBar } from "./SearchBar"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside``

export function SidePanel(props: SidePanelProps) {
  return (
    <SidePanelRoot>
      <GlobalInfo />
      <Options />
      <SearchBar updateSearchResult={props.updateSearchResult} />
      <Spacer />
      <Details />
      <Legend />
    </SidePanelRoot>
  )
}
