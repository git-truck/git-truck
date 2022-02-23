import styled from "styled-components"
import { Details } from "./Details"
import { GlobalInfo } from "./GlobalInfo"
import { Options } from "./Options"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside`
`

export function SidePanel() {
  return (
    <SidePanelRoot>
      <GlobalInfo />
      <Options />
      <Spacer />
      <Details />
    </SidePanelRoot>
  )
}
