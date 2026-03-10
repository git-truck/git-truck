import { mdiChevronRight, mdiSourceRepository } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useMemo, Fragment } from "react"
import { cn } from "~/styling"
import { useQueryStates } from "nuqs"
import { href, Link } from "react-router"
import { viewSearchParamsConfig } from "~/routes/view"
import { useDataNullable } from "~/contexts/DataContext"
import { getSep } from "~/shared/util"
import { AnalysisInfo } from "~/components/GlobalInfo"
import { browseSearchParamsConfig, browseSerializer } from "~/routes/browse"
import { PullButton } from "~/components/buttons/PullButton"

type Segment = {
  type: "browse" | "zoom" | "filler"
  segment: string
  fullPath: string
  showAnalysisInfo: boolean
}

export function Breadcrumb({ className = "", zoom = false }: { className?: string; zoom?: boolean }) {
  const [browseParams] = useQueryStates(browseSearchParamsConfig)
  const [viewParams, setViewParams] = useQueryStates(viewSearchParamsConfig)
  const { path, zoomPath } = viewParams
  const data = useDataNullable()

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
          showAnalysisInfo: false
        } satisfies Segment
      })
      .filter((segment) => segment.segment.length > 0)

    const zoomSegments = !data
      ? []
      : [
          // Parent folder
          {
            type: "browse",
            segment: data.repo.parentDirName ?? "",
            fullPath: data.repo.parentDirPath ?? "",
            showAnalysisInfo: false
          } as const,
          // Repository root
          {
            type: "zoom",
            segment: data.repo.repositoryName ?? "",
            fullPath: data.repo.repositoryName ?? "",
            showAnalysisInfo: true
          } as const,
          ...(zoomPath?.split(getSep(zoomPath)) ?? []).flatMap((segment, index, segments) => {
            if (segment === data?.repo.repositoryName) {
              // Ignore repository root, as it is added manually above
              return []
            }
            const fullPath = segments.slice(0, index + 1).join("/")
            return { type: "zoom", segment, fullPath, showAnalysisInfo: false } satisfies Segment
          })
        ]
    const segments = zoom ? zoomSegments : pathSegments

    if (segments.length > 4) {
      return [
        segments[0],
        segments[1],
        { type: "filler", segment: "...", fullPath: "", showAnalysisInfo: false } satisfies Segment,
        segments[segments.length - 2],
        segments[segments.length - 1]
      ] satisfies Array<Segment>
    }

    return segments
  }, [data, path, zoom, zoomPath])

  return (
    <div
      className={cn(
        "text-secondary-text dark:text-secondary-text-dark flex items-center gap-1 overflow-x-auto",
        className
      )}
    >
      {breadcrumbSegments.map(({ type, segment, fullPath, showAnalysisInfo: isRepo }, i) => {
        const title = isRepo
          ? "Reset zoom to repository root"
          : type === "browse"
            ? `Browse ${segment} directory`
            : `Zoom to ${segment} directory`
        const isFirst = i === 0
        const isLast = breadcrumbSegments.length - 1 === i

        const content = (
          <>
            {isRepo ? <Icon path={mdiSourceRepository} /> : null}
            {segment}
          </>
        )
        const button =
          isLast || type === "filler" ? (
            <span className="flex items-center gap-1 truncate font-bold" title={fullPath}>
              {content}
            </span>
          ) : type === "browse" ? (
            <Link
              to={href("/browse") + browseSerializer({ ...browseParams, offset: 0, search: null, path: fullPath })}
              title={title}
              className="btn btn--primary truncate"
            >
              {content}
            </Link>
          ) : (
            <button
              title={title}
              className="btn btn--primary truncate"
              onClick={() => {
                if (!data) {
                  throw Error("Attempting to access data when none is loaded")
                }
                setViewParams((prev) => ({ ...prev, zoomPath: fullPath }))
              }}
            >
              {content}
            </button>
          )

        return (
          <Fragment key={fullPath}>
            {!isFirst ? <Icon path={mdiChevronRight} /> : null}
            {isRepo ? <AnalysisInfo trigger={button} /> : button}
            {isRepo ? <PullButton /> : null}
          </Fragment>
        )
      })}
    </div>
  )
}
