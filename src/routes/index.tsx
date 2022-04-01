import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import styled from "styled-components";

import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"

export function links() {
  return [appStyles,
    varsStyles,
    indexStyles,
    chartStyles].map(x => (
      {
        rel: "stylesheet",
        href: x
      }))
}


const LoadingPane = styled.div`
  padding: 0.5em 2em;
  display: grid;
  place-items: center;
  border-radius: 5px;
`

const FullViewbox = styled.div`
  display: grid;
  place-items: center;
  height: 100vh;
  width: 100vw;
`

const StyledPath = styled.path`
  fill: none;
  stroke: #4580ff;
  /* transition: 1s; */
  animation: dash 1s linear infinite;
`

const LoadingText = styled.div`
  grid-area: 1/2;
`

const StyledSVG = styled.svg`
  grid-area: 1/2;
  &:hover > ${StyledPath} {
    stroke-dashoffset: 0;
  }
`

export default function Index() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/repo/")
  }, [])

  const width = 40;
  const height = 20;
  const length = width + height;

  const path = `M0,0 m-${width*0.5},-${height*0.5} l${width},0 l0,${height} l-${width},0 l0,-${height} Z`
  const viewBox = `-${height*0.5} -${width*0.5} ${height} ${width}`

  return (
    <>
      <FullViewbox>
        <LoadingPane>
          <LoadingText>analyzing...</LoadingText>
          <StyledSVG height="200px" width="400px" viewBox={viewBox}>
            <StyledPath strokeDasharray={length*0.5} strokeDashoffset={length} d={path}></StyledPath>
          </StyledSVG>
        </LoadingPane>
      </FullViewbox>
    </>
  )
}
