import styled from "styled-components"
import { Details } from "./Details"
import { Options } from "./Options"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside`
  background-color: #fff;
  box-shadow: 0.9px 0.9px 2.7px rgba(0, 0, 0, 0.07),
    2.2px 2.2px 6.9px rgba(0, 0, 0, 0.048),
    4.4px 4.4px 14.2px rgba(0, 0, 0, 0.039),
    9.1px 9.1px 29.2px rgba(0, 0, 0, 0.031), 25px 25px 80px rgba(0, 0, 0, 0.022);
`

export function SidePanel() {
  return (
    <SidePanelRoot>
      <Options />
      <Spacer />
      <Details />
    </SidePanelRoot>
  )
}
