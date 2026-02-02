import { mdiFile, mdiFolder, mdiGit } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Link, useLocation, useSearchParams } from "react-router"
import clsx from "clsx"
import { useMemo, type ReactNode } from "react"
import type { GitObject } from "~/shared/model"
import { CloseButton, LegendDot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { getPathFromRepoAndHead } from "~/shared/util"
import { IconRadioGroup } from "./EnumSelect"
import { useCreateLink } from "~/hooks"

export function DetailsCard({
  clickedObject,
  children,
  className = ""
}: {
  clickedObject: GitObject
  children: ReactNode
  className?: string
}) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  clickedObject = location.state?.clickedObject as GitObject | null | undefined
  const { metricType } = useOptions()
  const { databaseInfo } = useData()
  const createLink = useCreateLink()

  const [metricsData] = useMetrics()
  const { clickedObjectColor } = useMemo<{ clickedObjectColor: string | null }>(() => {
    if (!clickedObject) {
      return {
        clickedObjectColor: null
      }
    }
    const colormap = metricsData.get(metricType)?.colormap
    const clickedObjectColor = colormap?.get(clickedObject.path)

    if (!clickedObjectColor) {
      return {
        clickedObjectColor: null
      }
    }

    return {
      clickedObjectColor
    }
  }, [clickedObject, metricsData, metricType])

  // TODO: handle binary file properly or remove the entry
  return (
    <div className={clsx("card flex flex-col gap-2 backdrop-blur-sm transition-colors", className)}>
      <div className="flex">
        <h2 className="card__title grid w-full grid-cols-[auto_1fr_auto] gap-2 pl-0.5 text-current">
          {clickedObject.type === "tree" ? (
            <Icon path={mdiFolder} size="1.25em" />
          ) : clickedObjectColor ? (
            <LegendDot dotColor={clickedObjectColor} />
          ) : (
            <Icon path={mdiFile} size="1.25em" />
          )}
          <span className="truncate" title={clickedObject.name}>
            {clickedObject.name}
          </span>
          <Link
            to={getPathFromRepoAndHead({
              path: searchParams.get("path")!,
              branch: databaseInfo.branch
            })}
          >
            <CloseButton absolute={false} />
          </Link>
        </h2>
      </div>
      <IconRadioGroup
        large
        group={
          {
            general: "Details",
            commits: "Commits"
          } as const
        }
        iconMap={{
          general: mdiFolder,
          commits: mdiGit
        }}
        defaultValue={new URLSearchParams(location.search).get("tab") === "commits" ? "commits" : "general"}
        onChange={(v) => {
          createLink({
            segments: ["view", "details", v]
          }).navigate()
        }}
      />
      {/*  <div className="grid grid-cols-2 place-items-stretch">
        <Link
          to={{
            ...location,
            pathname: "./details"
          }}
          state={location.state}
        >
          <Tab
            className={location.pathname.endsWith("details") ? "secondary" : ""}
            title="General"
            active={location.pathname.endsWith("details")}
          />
        </Link>
        <Link
          to={{
            ...location,
            pathname: "./commits"
          }}
          state={location.state}
        >
          <Tab
            className={location.pathname.endsWith("details") ? "secondary" : ""}
            title="Commits"
            active={location.pathname.endsWith("commits")}
          />
        </Link>
      </div> */}
      {children}
    </div>
  )
}
