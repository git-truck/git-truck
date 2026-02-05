import { mdiChevronRight, mdiHome } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useMemo, Fragment } from "react"
import { cn } from "~/styling"
import { useQueryState } from "nuqs"
import { href, useNavigate } from "react-router"
import { viewSerializer } from "~/routes/view"
import { useDataNullable } from "~/contexts/DataContext"
import { getSep } from "~/shared/util"
import { AnalysisInfo } from "./GlobalInfo"

export function Breadcrumb({ repoPath, className = "" }: { repoPath?: string; className?: string }) {
  // TODO: Refactor breadcrumb to display a "browse parent folder" as well as a file picker
  const [queryPath] = useQueryState("path")
  const [zoomPath, setZoomPath] = useQueryState("zoomPath")
  const data = useDataNullable()

  const path = zoomPath ?? queryPath
  const navigate = useNavigate()

  const paths = useMemo<[string, string][]>(() => {
    if (!path) return []

    const parts = path === "" ? [] : path.split(getSep(path))
    const segments: [string, string][] = parts.map((part, index) => {
      const fullPath = parts.slice(0, index + 1).join("/")
      return [part, fullPath]
    })

    if (segments.length > 3) {
      return [segments[0], ["...", ""], segments[segments.length - 2], segments[segments.length - 1]]
    }

    return segments
  }, [path])

  return (
    <div
      className={cn(
        "text-secondary-text dark:to-secondary-text-dark -m-2 flex items-center gap-1 overflow-x-auto",
        className
      )}
    >
      {paths.map(([name, p], i) => {
        // TODO: This wont work when switching to absolute paths for objectPath
        const isHigherLevelThanRepo = repoPath && !p.includes(repoPath)
        const onClick = () => {
          if (isHigherLevelThanRepo) {
            navigate(href("/browse") + viewSerializer({ path: p }))
            return
          }
          if (!data) {
            throw Error("Attempting to access data when none is loaded")
          }
          setZoomPath(p)
        }
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
              {i === 0 ? (
                <AnalysisInfo onClick={onClick} />
              ) : (
                <button
                  title={`${isHigherLevelThanRepo ? "Browse" : "Zoom"} to ${name}`}
                  className="btn flex min-w-fit cursor-pointer flex-row gap-2 font-bold"
                  onClick={onClick}
                >
                  {i === 0 ? <Icon path={mdiHome} size={1} /> : null}
                  {name}
                </button>
              )}
              <Icon path={mdiChevronRight} size={1} className="min-w-fit" />
            </Fragment>
          )
      })}
    </div>
  )
}
