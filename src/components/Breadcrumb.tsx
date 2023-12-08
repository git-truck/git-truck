import { mdiChevronRight, mdiHome } from "@mdi/js"
import { Icon } from "@mdi/react"
import { useMemo, Fragment } from "react"
import { useData } from "~/contexts/DataContext"
import { usePath } from "~/contexts/PathContext"

export function Breadcrumb() {
  const { repo } = useData()
  const { path, setPath } = usePath()
  const paths = useMemo<[string, string][]>(() => {
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
                <Fragment key={p}>
                  <button
                    className="card flex flex-row gap-2 px-2 py-1 font-bold hover:opacity-70"
                    onClick={() => setPath(p)}
                  >
                    {i === 0 ? <Icon path={mdiHome} size={1} /> : null}
                    {name}
                  </button>
                  <Icon path={mdiChevronRight} size={1} />
                </Fragment>
              )
          })
        : null}
    </div>
  )
}
