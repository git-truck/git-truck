import { mdiChevronDoubleRight, mdiChevronRight, mdiSourceRepository } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useMemo, Fragment } from "react"
import { cn } from "~/styling"
import { useQueryStates } from "nuqs"
import { href, Link } from "react-router"
import { viewSearchParamsConfig } from "~/shared/viewParams"
import { useDataNullable } from "~/contexts/DataContext"
import { getSep } from "~/shared/util"
import { AnalysisInfo } from "~/components/GlobalInfo"
import { browseSearchParamsConfig, browseSerializer } from "~/routes/browse"
import { useClickedObjectNullable, useSetClickedObjectPath } from "~/state/stores/clicked-object"
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"

type Segment = {
  type: "browse" | "zoom" | "filler" | "clicked"
  segment: string
  fullPath: string
  parentPath: string
  showAnalysisInfo: boolean
}

export function Breadcrumb({ className = "", zoom = false }: { className?: string; zoom?: boolean }) {
  const [browseParams] = useQueryStates(browseSearchParamsConfig)
  const [viewParams, setViewParams] = useQueryStates(viewSearchParamsConfig)
  const setClickedObjectPath = useSetClickedObjectPath()
  const { path, zoomPath } = viewParams
  const data = useDataNullable()
  const clickedObject = useClickedObjectNullable()
  const clickedObjectIsZoomPath = clickedObject?.path === zoomPath

  const breadcrumbSegments = useMemo<Array<Segment>>(() => {
    if (!path) return []

    const pathSegments = path
      .split(getSep(path))
      .map((segment, i, segments) => {
        const fullPath = segments.slice(0, i + 1).join("/")
        return {
          type: "browse",
          segment: segment.length === 0 && i === 0 ? "/" : segment,
          fullPath: i === 0 ? fullPath + getSep(path) : fullPath,
          parentPath: i === 0 ? "" : segments.slice(0, i).join("/"),
          showAnalysisInfo: false
        } satisfies Segment
      })
      .filter((segment) => segment.segment.length > 0)

    const zoomSegments = !data
      ? []
      : [
          // Parent folder
          // TODO: Reenable and fix browsing
          // {
          //   type: "browse",
          //   segment: data.repo.parentDirName ?? "",
          //   fullPath: data.repo.parentDirPath ?? "",
          //   showAnalysisInfo: false
          // } as const,
          // Repository root
          {
            type: "zoom",
            segment: data.repo.repositoryName,
            fullPath: data.repo.repositoryName,
            parentPath: data.repo.repositoryName,
            showAnalysisInfo: true
          } as const,
          ...(zoomPath?.split(getSep(zoomPath)) ?? []).flatMap((segment, index, segments) => {
            if (segment === data?.repo.repositoryName) {
              // Ignore repository root, as it is added manually above
              return []
            }
            const fullPath = segments.slice(0, index + 1).join("/")
            const parentPath = index > 0 ? segments.slice(0, index).join("/") : ""
            return { type: "zoom", segment, fullPath, parentPath, showAnalysisInfo: false } satisfies Segment
          })
        ]
    const segments = zoom ? zoomSegments : pathSegments

    if (segments.length > 4) {
      return [
        segments[0],
        segments[1],
        { type: "filler", segment: "...", fullPath: "", parentPath: "", showAnalysisInfo: false } satisfies Segment,
        segments[segments.length - 2],
        segments[segments.length - 1]
      ] satisfies Array<Segment>
    }

    return segments
  }, [data, path, zoom, zoomPath])

  return (
    <div
      className={cn(
        "text-secondary-text dark:text-secondary-text-dark flex h-8 items-center justify-stretch gap-1 overflow-x-auto",
        className
      )}
    >
      {breadcrumbSegments.map(({ type, segment, fullPath, parentPath, showAnalysisInfo: isRepo }, i) => {
        const title = isRepo
          ? "Reset zoom to repository root"
          : type === "browse"
            ? `Browse ${segment} directory`
            : clickedObjectIsZoomPath
              ? "Zoom to parent"
              : `Zoom to ${segment} directory`
        const isFirst = i === 0

        const content = (
          <>
            {isRepo ? <Icon path={mdiSourceRepository} /> : null}
            {segment}
          </>
        )
        const button =
          type === "filler" ? (
            <div
              title={fullPath}
              className="text-tertiary-text dark:text-tertiary-text-dark pointer-events-none flex w-max items-center gap-2 truncate text-sm font-bold opacity-80"
            >
              {content}
            </div>
          ) : type === "browse" ? (
            <Link
              to={href("/browse") + browseSerializer({ ...browseParams, offset: 0, search: null, path: fullPath })}
              title={title}
              className="text-secondary-text dark:text-secondary-text-dark flex cursor-pointer items-center gap-1 truncate text-sm font-bold"
              onClick={() => setClickedObjectPath(null)}
            >
              {content}
            </Link>
          ) : (
            <button
              title={title}
              className="text-secondary-text dark:text-secondary-text-dark flex cursor-pointer items-center gap-1 truncate text-sm font-bold"
              onClick={() => {
                if (!data) {
                  throw Error("Attempting to access data when none is loaded")
                }
                if (zoomPath === fullPath) {
                  if (clickedObjectIsZoomPath) {
                    setViewParams((prev) => ({ ...prev, zoomPath: parentPath }))
                    return
                  } else {
                    setClickedObjectPath(null)
                    return
                  }
                }
                setViewParams((prev) => ({ ...prev, zoomPath: fullPath }))
              }}
            >
              {content}
            </button>
          )

        return (
          <Fragment key={fullPath}>
            {!isFirst ? <Icon path={mdiChevronRight} size="1.25rem" /> : null}
            {isRepo ? <AnalysisInfo trigger={button} /> : button}
          </Fragment>
        )
      })}

      {clickedObject && clickedObject.path !== zoomPath && clickedObject.path !== data?.repo.repositoryName ? (
        <>
          <Icon path={mdiChevronDoubleRight} className="mx-1" size="1.25rem" />
          <ClickedObjectButton />
        </>
      ) : null}
    </div>
  )
}
