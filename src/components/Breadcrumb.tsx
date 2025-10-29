import { mdiChevronRight, mdiHome } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useMemo, Fragment } from "react"
import { usePath } from "~/contexts/PathContext"

export function Breadcrumb() {
  const { path, setPath } = usePath()
  const paths = useMemo<[string, string][]>(() => {
    const parts = path === "" ? [] : path.split("/")
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
    <div className="text-secondary-text dark:to-secondary-text-dark -m-2 flex items-center gap-1 overflow-x-auto">
      {paths.map(([name, p], i) => {
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
                title={`Navigate to ${name}`}
                className="btn flex min-w-fit cursor-pointer flex-row gap-2 font-bold"
                onClick={() => setPath(p)}
              >
                {i === 0 ? <Icon path={mdiHome} size={1} /> : null}
                {name}
              </button>
              <Icon path={mdiChevronRight} size={1} className="min-w-fit" />
            </Fragment>
          )
      })}
    </div>
  )
}
