import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"
import { Fullscreen as FullscreenIcon, CloseFullscreen as CloseFullscreenIcon } from "@styled-icons/material"
import { Dispatch, SetStateAction, useMemo } from "react"
import { Icon } from "@mdi/react"
import { mdiHome, mdiChevronRight } from "@mdi/js"

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

  return (
    <MainRoot>
      <TopBar>
        <Breadcrumb />
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

function Breadcrumb() {
  const { repo } = useData()
  const { path, setPath } = usePath()
  let temppath = path
  const paths = useMemo<[string, string][]>(() => {
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
    return paths.reverse()
  }, [path, repo.name])

  return (
    <div className="flex items-center gap-1">
      {paths.length > 1
        ? paths.map(([name, p], i) => {
            if (p === "" || i === paths.length - 1)
              if (p === "")
                return (
                  <>
                    <span className="font-bold" key={p}>
                      {name}
                    </span>
                    <Icon path={mdiChevronRight} size={1} />
                  </>
                )
              else
                return (
                  <span className="font-bold" key={p}>
                    {name}
                  </span>
                )
            else
              return (
                <>
                  <button
                    className="card flex flex-row gap-2 px-2 py-1 font-bold hover:opacity-70"
                    key={p}
                    onClick={() => setPath(p)}
                  >
                    {i === 0 ? <Icon path={mdiHome} size={1} /> : null}
                    {name}
                  </button>
                  <Icon path={mdiChevronRight} size={1} />
                </>
              )
          })
        : null}
    </div>
  )
}
