import styled from "styled-components"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"

export const MainRoot = styled.main`
  overflow: hidden;
  height: 100%;
`

export function Main() {
  const [ref, size] = useComponentSize()

  return (
    <MainRoot ref={ref}>
      <Chart size={size} />
    </MainRoot>
  )
}
