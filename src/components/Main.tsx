import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"
import { useComponentSize } from "../hooks"
import { Chart } from "./Chart"
import { Fullscreen as FullscreenIcon, CloseFullscreen as CloseFullscreenIcon } from "@styled-icons/material"
import { Dispatch, Fragment, SetStateAction, useMemo } from "react"
import { Icon } from "@mdi/react"
import { mdiHome, mdiChevronRight } from "@mdi/js"

interface MainProps {
  fullscreenState: [boolean, Dispatch<SetStateAction<boolean>>]
}

export function Main({ fullscreenState: [isFullscreen, setIsFullscreen] }: MainProps) {
  const [ref, size] = useComponentSize()

  return (
    <main className="grid h-full min-w-[100px] grid-rows-[auto,1fr] overflow-hidden">
      <header className="grid grid-flow-col items-center justify-between gap-2 p-2">
        <Breadcrumb />
        <button className="card btn--icon p-1" onClick={() => setIsFullscreen((isFullscreen) => !isFullscreen)}>
          {isFullscreen ? <CloseFullscreenIcon height="1.5em" /> : <FullscreenIcon height="1.5em" />}
        </button>
      </header>
      <div className="grid place-items-center overflow-hidden" ref={ref}>
        <Chart size={size} />
      </div>
    </main>
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
                  <Fragment key={p}>
                    <span className="font-bold">{name}</span>
                    <Icon path={mdiChevronRight} size={1} />
                  </Fragment>
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
