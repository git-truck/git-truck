import { useRef, useState } from "react"
import styled from "styled-components"
import { Details } from "./Details"
import { GlobalInfo } from "./GlobalInfo"
import { NewLegend } from "./NewLegend"
import { Options } from "./Options"
import { Spacer } from "./Spacer"

const SidePanelRoot = styled.aside``

export function SidePanel() {
  return (
    <SidePanelRoot>
      <GlobalInfo />
      <Options />
      <Spacer />
      <Details />
      {/* <NewLegend items={["meme|red","lol|green","næver|yellow",".md|orange",".ts|cadetblue",".html|pink"]} /> */}
    </SidePanelRoot>
  )
}
