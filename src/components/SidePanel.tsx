import styled from "styled-components"

const SidePanelRoot = styled.aside`
  overflow-y: auto;
  overflow-x: hidden;
`

export function SidePanel(props: { children: React.ReactNode }) {
  return (
    <SidePanelRoot>{props.children}</SidePanelRoot>
  )
}
