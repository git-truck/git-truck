import { mdiFile, mdiFolder, mdiGit } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import clsx from "clsx"
import { useMemo, type ReactNode } from "react"
import type { GitObject } from "~/shared/model"
import { CloseButton, LegendDot } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { getPathFromRepoAndHead } from "~/shared/util"
import { IconRadioGroup } from "./EnumSelect"

export function DetailsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [searchParams] = useSearchParams()
  // const clickedObjectPath = searchParams.get("path")
  // const navigate = useNavigate()
  // const { setClickedObject, clickedObject } = useClickedObject()
  const location = useLocation()
  const navigate = useNavigate()
  const clickedObject = location.state?.clickedObject as GitObject | null | undefined
  const { metricType } = useOptions()
  const { databaseInfo } = useData()

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

  if (!clickedObject) return null

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
      {/* <Tabs
        tabs={[
          {
            title: "General",
            content: (
              <>
                <div className="flex grow flex-col gap-2">
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    <CommitsEntry count={commitCount ?? 0} />
                    {isBlob ? (
                      <>
                        <SizeEntry size={clickedObject.sizeInBytes} isBinary={false} />
                        <LastchangedEntry epoch={databaseInfo.lastChanged[slicedPath]} />
                      </>
                    ) : (
                      <FileAndSubfolderCountEntries clickedTree={clickedObject} />
                    )}
                    <PathEntry path={clickedObject.path} />
                  </div>
                  <div className="card">
                    <Outlet />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {isBlob ? (
                    <>
                      <Form className="w-max" method="post" action={location.pathname}>
                        <input type="hidden" name="ignore" value={clickedObject.path} />
                        <button
                          className="btn btn--outlined"
                          type="submit"
                          disabled={state !== "idle"}
                          onClick={() => {
                            isProcessingHideRef.current = true
                          }}
                          title="Hide this file"
                        >
                          <Icon path={mdiEyeOffOutline} />
                          Hide
                        </button>
                      </Form>
                      {clickedObject.name.includes(".") ? (
                        <Form className="w-max" method="post" action={location.pathname}>
                          <input type="hidden" name="ignore" value={`*.${extension}`} />
                          <button
                            className="btn btn--outlined"
                            type="submit"
                            disabled={state !== "idle"}
                            title={`Hide all files with .${extension} extension`}
                            onClick={() => {
                              isProcessingHideRef.current = true
                            }}
                          >
                            <Icon path={mdiEyeOffOutline} />
                            <span>Hide *.{extension}</span>
                          </button>
                        </Form>
                      ) : null}
                    </>
                  ) : (
                    <Form method="post" action={location.pathname}>
                      <input type="hidden" name="ignore" value={clickedObject.path} />
                      <button
                        className="btn btn--outlined"
                        type="submit"
                        disabled={state !== "idle"}
                        onClick={() => {
                          isProcessingHideRef.current = true
                          setPath(OneFolderOut(path))
                        }}
                      >
                        <Icon path={mdiEyeOffOutline} />
                        Hide this folder
                      </button>
                    </Form>
                  )}
                  <button className="btn btn--outlined" onClick={showUnionAuthorsModal}>
                    <Icon path={mdiAccountMultiple} />
                    Group authors
                  </button>
                </div>
              </>
            )
          },
          { title: "Commits", content: <CommitHistory commitCount={commitCount ?? 0} /> }
        ]}
      /> */}
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
          const searchParams = new URLSearchParams(location.search)
          searchParams.set("tab", v)
          navigate(
            {
              ...location,
              search: searchParams.toString()
            },
            { state: location.state }
          )
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
