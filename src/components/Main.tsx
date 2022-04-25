import { useState } from "react"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"

export const MainRoot = styled.main`
  display: grid;
  grid-template-rows: auto 1fr 80px;
  overflow: hidden;
  height: 100%;
`

const Breadcrumb = styled.div`
  margin: var(--unit);
  & > * {
    margin: 0 calc(var(--unit) * 0.5);
  }
`

export const ClickableText = styled.button`
  background: none;
  border: none;
  font-family: inherit;
  font-weight: inherit;
  font-size: inherit;
  color: hsl(210, 10%, 50%);
  cursor: pointer;
  &:hover {
    color: #8080ff;
    text-decoration-color: #8080ff;
  }
`

export const NonClickableText = styled.span`
  color: hsl(210, 10%, 30%);
  cursor: default;
`

const ChartWrapper = styled.div`
  display: grid;
  place-items: center;
  overflow: hidden;
`

export function Main() {
  const [ref, size] = useComponentSize()
  const { path, setPath } = usePath()
  const { repo } = useData()

  let temppath = path
  let paths: [string, string][] = []

  for (let i = 0; i < 8; i++) {
    if (temppath === "") {
      break
    }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx + 1), temppath])
    temppath = temppath.substring(0, idx)
  }

  if (temppath !== "") {
    paths = paths.slice(0, paths.length - 1)
    paths.push(["...", ""])
    paths.push([repo.name, repo.name])
  }

  return (
    <MainRoot>
      {paths.length > 1 ? (
        <Breadcrumb>
          {paths.reverse().map(([name, p], i) => {
            if (p === "" || i === paths.length - 1)
              if (p === "")
                return (
                  <>
                    <NonClickableText key={p}>{name}</NonClickableText>
                    <span>{"\u203A"}</span>
                  </>
                )
              else return <NonClickableText key={p}>{name}</NonClickableText>
            else
              return (
                <>
                  <ClickableText key={p} onClick={() => setPath(p)}>
                    {name}
                  </ClickableText>
                  <span>{"\u203A"}</span>
                </>
              )
          })}
        </Breadcrumb>
      ) : (
        <Breadcrumb />
      )}
      <ChartWrapper ref={ref}>
        <Chart size={size} />
      </ChartWrapper>
      <TimeLine />
    </MainRoot>
  )
}

export function TimeLine() {

  const minorVersions = [
    "v0.9.0",
    "v0.8.0",
    "v0.7.0",
    "v0.6.0",
    "v0.5.0",
    "v0.4.0",
    "v0.3.0",
    "v0.2.0",
    "v0.1.0",
  ]

  const patchVersions = [
    "v0.1.0",
    "v0.2.0",
    "v0.3.0",
    "v0.4.0",
    "v0.5.0",
    "v0.5.1",
    "v0.5.2",
    "v0.5.3",
    "v0.5.4",
    "v0.5.5",
    "v0.5.6",
    "v0.5.7",
    "v0.5.8",
    "v0.5.9",
    "v0.5.10",
    "v0.5.16",
    "v0.6.0",
    "v0.6.2",
    "v0.6.3",
    "v0.6.4",
    "v0.6.5",
    "v0.6.6",
    "v0.6.7",
    "v0.6.8",
    "v0.6.9",
    "v0.6.10",
    "v0.6.11",
    "v0.7.0",
    "v0.8.0",
    "v0.9.0",
  ]

  const [versions, setVersions] = useState(minorVersions)
  const [v, setV] = useState(0)

  return (
    <Container>
      <TimeLineContainer>
        <Line></Line>
        <Dots>
          {
            versions.map((version, i) => {
              return <Dot id={i == v ? "selected" : ""} title={version} key={version}></Dot>
            })
          }
        </Dots>
      </TimeLineContainer>
      <HiddenRange
        type="range"
        min={0}
        max={versions.length-1}
        value={v}
        onChange={(evt) => setV(Number(evt.target.value))}
      />
    </Container>
  )
}

const Dot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: hsla(0, 0%, 50%, 1);
  color: hsl(0, 0%, 80%);
  outline: 2px solid var(--global-bg-color);

  &#selected {
    background-color: hsla(0, 100%, 50%, 1);
  }

  position: relative;
  &::before {
    content: '${props => props.title}';
    position: absolute;
    transform: translate(-50%,-150%);
  }
  &#selected::before {
    color: hsl(0,0%,50%);
  }
`

const Dots = styled.div`
  width: 100%;
  grid-area: 1/-1;

  display: grid;
  align-items: center;
  justify-content: space-around;
  grid-auto-flow: column;
`

const Line = styled.div`
  grid-area: 1/-1;
  height: 3px;
  background-color: hsl(0, 0%, 80%);
  border-radius: 10000px;
`

const TimeLineContainer = styled.div`
  width: 100%;
  height: 100%;
  grid-area: 1/-1;

  
  display: grid;
  align-items: center;
`

const HiddenRange = styled.input`
  width: 100%;
  height: 100%;
  grid-area: 1/-1;
  opacity: 0;
`

const Container = styled.div`
  height: 100%;
  display: grid;
  /* border: 2px solid black; */
`