import { mdiChevronRight, mdiSourceRepository } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useMemo, Fragment } from "react"
import { cn } from "~/styling"
import { useQueryStates } from "nuqs"
import { href, useNavigate } from "react-router"
import { viewSearchParamsConfig } from "~/routes/view"
import { useDataNullable } from "~/contexts/DataContext"
import { comparePaths, getSep } from "~/shared/util"
import { AnalysisInfo } from "./GlobalInfo"
import { browseSearchParamsConfig, browseSerializer } from "~/routes/browse"

type Segment = {
  type: "browse" | "zoom" | "filler"
  segment: string
  fullPath: string
  isRepo: boolean
}

export function Breadcrumb({ className = "", zoom = false }: { className?: string; zoom?: boolean }) {
  const [browseParams] = useQueryStates(browseSearchParamsConfig)
  const [{ path, zoomPath }, setSearchParams] = useQueryStates(viewSearchParamsConfig)
  const data = useDataNullable()

  const navigate = useNavigate()

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
          isRepo: i === segments.length - 1
        } satisfies Segment
      })
      .filter((segment) => segment.segment.length > 0)
    const zoomSegments = [
      {
        type: "browse",
        segment: data?.repo.parentDirName ?? "",
        fullPath: data?.repo.parentDirPath ?? "",
        isRepo: false
      } as const,
      {
        type: "browse",
        segment: data?.repo.repositoryName ?? "",
        fullPath: data?.repo.repositoryPath ?? "",
        isRepo: true
      } as const,
      ...(zoomPath?.split(getSep(zoomPath)) ?? []).slice(1).map((segment, index, segments) => {
        const fullPath = segments.slice(0, index + 1).join("/")
        return { type: "zoom", segment, fullPath, isRepo: index === 0 } satisfies Segment
      })
    ]
    const segments = zoom ? zoomSegments : pathSegments

    if (segments.length > 4) {
      return [
        segments[0],
        segments[1],
        { type: "filler", segment: "...", fullPath: "", isRepo: false } satisfies Segment,
        segments[segments.length - 2],
        segments[segments.length - 1]
      ] satisfies Array<Segment>
    }

    return segments
  }, [
    data?.repo.parentDirName,
    data?.repo.parentDirPath,
    data?.repo.repositoryName,
    data?.repo.repositoryPath,
    path,
    zoom,
    zoomPath
  ])

  return (
    <div
      className={cn(
        "text-secondary-text dark:text-secondary-text-dark flex items-center gap-1 overflow-x-auto",
        className
      )}
    >
      {breadcrumbSegments.map(({ type, segment, fullPath }, i) => {
        const isRepo = data && comparePaths(fullPath, data.repo.repositoryPath)
        const title = isRepo
          ? "Reset zoom to repository root"
          : type === "browse"
            ? `Browse ${segment} directory`
            : `Zoom to ${segment} directory`
        const isFirst = i === 0
        const isLast = breadcrumbSegments.length - 1 === i

        const onClick = () => {
          if (type === "browse") {
            navigate(href("/browse") + browseSerializer({ ...browseParams, path: fullPath, search: null }))
            return
          }
          if (!data) {
            throw Error("Attempting to access data when none is loaded")
          }
          setSearchParams((prev) => ({ ...prev, zoomPath: fullPath }))
        }

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
          ) : (
            // TODO: This should be a link
            <button title={title} className="btn btn--primary truncate" onClick={onClick}>
              {content}
            </button>
          )

        return (
          <Fragment key={fullPath}>
            {!isFirst ? <Icon path={mdiChevronRight} /> : null}
            {isRepo ? <AnalysisInfo trigger={button} /> : button}
          </Fragment>
        )
      })}
    </div>
  )
}
