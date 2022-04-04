import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import styled from "styled-components";

const LoadingPane = styled.div`
  padding: 0.5em 2em;
  display: grid;
  place-items: center;
  border-radius: 5px;

  /* hide_initially animation */
  opacity: 0;
  animation: hide_initially 0s linear forwards;
  animation-delay: 1s;
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
  animation: dash 2s ease-in-out alternate infinite;
`

const LoadingText = styled.div`
  grid-area: 1/2;
`

const StyledSVG = styled.svg`
  grid-area: 1/2;
`

export default function Index() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/repo/")
  }, [])

  const width = 20;
  const height = 20;
  const length = width + height;

  const path = `M0,0 m-${width*0.5},-${height*0.5} l${width},0 l0,${height} l-${width},0 l0,-${height} Z`
  const viewBox = `-${height*0.5} -${width*0.5} ${height} ${width}`

  return (
    <>
      <FullViewbox>
        <LoadingPane>
          <LoadingText>Analyzing...</LoadingText>
          <StyledSVG height="160px" width="160px" viewBox={viewBox}>
            <StyledPath strokeDasharray={length*0.5} strokeDashoffset={length*2} d={path}></StyledPath>
          </StyledSVG>
        </LoadingPane>
      </FullViewbox>
    </>
  )
}
