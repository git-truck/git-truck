import styled from "styled-components"
import { Details } from "./Details"
import { Options } from "./Options"
import { Spacer } from "./Spacer"
import { Box } from "./util"

const SidePanelRoot = styled(Box)`
  border-radius: 0;
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
