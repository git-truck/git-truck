import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"
import { Fullscreen as FullscreenIcon, CloseFullscreen as CloseFullscreenIcon } from "@styled-icons/material"
import type { Dispatch, SetStateAction } from "react"

export const MainRoot = styled.main`
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  min-width: 100px;
  height: 100%;
`

const TopBar = styled.div`
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  justify-content: space-between;
  margin: var(--unit);
`

const Breadcrumb = styled.div`
  height: 1.5em;
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

interface MainProps {
  fullscreenState: [boolean, Dispatch<SetStateAction<boolean>>]
}

export function Main({ fullscreenState: [isFullscreen, setIsFullscreen] }: MainProps) {
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
      <TopBar>
        <Breadcrumb>
          {paths.length > 1
            ? paths.reverse().map(([name, p], i) => {
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
              })
            : null}
        </Breadcrumb>
        <button className="btn--icon" onClick={() => setIsFullscreen((isFullscreen) => !isFullscreen)}>
          {isFullscreen ? <CloseFullscreenIcon height="1.5em" /> : <FullscreenIcon height="1.5em" />}
        </button>
      </TopBar>
      <ChartWrapper ref={ref}>
        <Chart size={size} />
      </ChartWrapper>
    </MainRoot>
  )
}
