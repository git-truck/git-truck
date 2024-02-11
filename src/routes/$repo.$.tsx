import { resolve } from "path"
import type { Dispatch, SetStateAction } from "react"
import { memo, useEffect, useMemo, useRef, useState } from "react"
import { useBoolean, useMouse } from "react-use"
import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { typedjson, useTypedLoaderData } from "remix-typedjson"
import { Link, isRouteErrorResponse, useRouteError } from "@remix-run/react"
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server"
import { getTruckConfigWithArgs } from "~/analyzer/args.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import type { AnalyzerData, HydratedGitObject, Repository, TruckUserConfig } from "~/analyzer/model"
import { getGitTruckInfo } from "~/analyzer/util.server"
import { addAuthorUnion, makeDupeMap, unionAuthors } from "~/authorUnionUtil.server"
import { DetailsCard } from "~/components/DetailsCard"
import { GlobalInfo } from "~/components/GlobalInfo"
import { HiddenFiles } from "~/components/HiddenFiles"
import { Legend } from "~/components/legend/Legend"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import { SearchCard } from "~/components/SearchCard"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"
import { Code } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { semverCompare } from "~/util"
import { mdiFullscreen, mdiFullscreenExit, mdiChevronRight, mdiChevronLeft } from "@mdi/js"
import { Breadcrumb } from "~/components/Breadcrumb"
import { FeedbackCard } from "~/components/FeedbackCard"
import { Chart } from "~/components/Chart"
import { Icon } from "@mdi/react"
import { useClient } from "~/hooks"
import clsx from "clsx"
import { Tooltip } from "~/components/Tooltip"
import { createPortal } from "react-dom"
import randomstring from "randomstring"
import { Online } from "react-detect-offline"
import { cn } from "~/styling"

let invalidateCache = false

export interface RepoData {
  analyzerData: AnalyzerData
  repo: Repository
  truckConfig: TruckUserConfig
  gitTruckInfo: {
    version: string
    latestVersion: string | null
  }
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!params["repo"] || !params["*"]) {
    return redirect("/")
  }

  const [args, truckConfig] = await getTruckConfigWithArgs(params["repo"] as string)
  const options: TruckUserConfig = {
    invalidateCache: invalidateCache || args.invalidateCache
  }
  options.path = resolve(args.path, params["repo"])
  options.branch = params["*"]

  if (params["*"]) {
    options.branch = params["*"]
  }

  const analyzerData = await analyze({ ...args, ...options }).then((data) =>
    addAuthorUnion(data, makeDupeMap(truckConfig.unionedAuthors ?? []))
  )

  invalidateCache = false
  const repo = await GitCaller.getRepoMetadata(options.path, Boolean(options.invalidateCache))

  if (!repo) {
    throw Error("Error loading repo")
  }

  return typedjson<RepoData>({
    analyzerData,
    repo,
    gitTruckInfo: await getGitTruckInfo(),
    truckConfig
  })
}

export const action: ActionFunction = async ({ request, params }) => {
  if (!params["repo"]) {
    throw Error("This can never happen, since this route is only called if a repo exists in the URL")
  }
  const formData = await request.formData()
  const refresh = formData.get("refresh")
  const unignore = formData.get("unignore")
  const ignore = formData.get("ignore")
  const fileToOpen = formData.get("open")
  const unionedAuthors = formData.get("unionedAuthors")
  const rerollColors = formData.get("rerollColors")

  if (refresh) {
    invalidateCache = true
    return null
  }

  const [args] = await getTruckConfigWithArgs(params["repo"])
  const path = resolve(args.path, params["repo"])

  if (ignore && typeof ignore === "string") {
    await updateTruckConfig(path, (prevConfig) => {
      const hiddenFilesSet = new Set((prevConfig?.hiddenFiles ?? []).map((x) => x.trim()))
      hiddenFilesSet.add(ignore)

      return {
        ...prevConfig,
        hiddenFiles: Array.from(hiddenFilesSet.values())
      }
    })
    return null
  }

  if (unignore && typeof unignore === "string") {
    await updateTruckConfig(resolve(args.path, params["repo"]), (prevConfig) => {
      const hiddenFilesSet = new Set((prevConfig?.hiddenFiles ?? []).map((x) => x.trim()))
      hiddenFilesSet.delete(unignore.trim())

      return {
        ...prevConfig,
        hiddenFiles: Array.from(hiddenFilesSet.values())
      }
    })
    return null
  }

  if (typeof fileToOpen === "string") {
    openFile(fileToOpen)
    return null
  }

  if (typeof unionedAuthors === "string") {
    try {
      const json = JSON.parse(unionedAuthors)
      await updateTruckConfig(resolve(args.path, params["repo"]), (prevConfig) => {
        return {
          ...prevConfig,
          unionedAuthors: json
        }
      })
    } catch (e) {
      console.error(e)
    }
    return null
  }

  if (typeof rerollColors === "string") {
    const newSeed = randomstring.generate(6)
    await updateTruckConfig(resolve(args.path, params["repo"]), (prevConfig) => {
      return {
        ...prevConfig,
        colorSeed: newSeed
      }
    })
    return null
  }
  return null
}

export const ErrorBoundary = () => {
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])

  if (isRouteErrorResponse(error)) {
    return (
      <div className="app-container">
        <div />
        <div className="card">
          <h1>An error occured!</h1>
          <p>See console for more infomation.</p>
          <p>Message: {error.data.message}</p>
          <Code>{error.data.message}</Code>
          <div>
            <Link to=".">Retry</Link>
          </div>
          <div>
            <Link to="..">Go back</Link>
          </div>
        </div>
      </div>
    )
  }

  let errorMessage = "Unknown error"
  if (typeof error === "string") {
    errorMessage = error
  } else if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    errorMessage = error.message
  }

  return (
    <div className="app-container">
      <div />
      <div className="card">
        <h1>An error occured!</h1>
        <p>See console for more infomation.</p>
        <Code>{errorMessage}</Code>
        <div>
          <Link to=".">Retry</Link>
        </div>
        <div>
          <Link to="..">Go back</Link>
        </div>
      </div>
    </div>
  )
}

const UpdateNotifier = memo(function UpdateNotifier() {
  const { gitTruckInfo } = useData()
  return (
    <div className="card">
      <p>Update available: {gitTruckInfo.latestVersion}</p>
      <p className="card-p">Currently installed: {gitTruckInfo.version}</p>
      <p className="card-p">
        To update, close application and run: <Code inline>npx git-truck@latest</Code>
      </p>
    </div>
  )
})

export default function Repo() {
  const client = useClient()
  const data = useTypedLoaderData<RepoData>()
  const { analyzerData, gitTruckInfo } = data
  const [isLeftPanelCollapse, setIsLeftPanelCollapse] = useState<boolean>(false)
  const [isRightPanelCollapse, setIsRightPanelCollapse] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useBoolean(false)
  const [hoveredObject, setHoveredObject] = useState<HydratedGitObject | null>(null)
  const showUnionAuthorsModal = (): void => setUnionAuthorsModalOpen(true)

  const containerClass = useMemo(
    function getContainerClass() {
      // The fullscreen overrides the collapses
      if (isFullscreen) {
        return "fullscreen"
      }

      // The classes for collapses
      if (isLeftPanelCollapse && isRightPanelCollapse) {
        return "both-collapse"
      }

      if (isLeftPanelCollapse) {
        return "left-collapse"
      }

      if (isRightPanelCollapse) {
        return "right-collapse"
      }

      // The default class is none
      return ""
    },
    [isFullscreen, isLeftPanelCollapse, isRightPanelCollapse]
  )

  if (!analyzerData) return null

  return (
    <Providers data={data}>
      <div className={cn("app-container", containerClass)}>
        <aside
          className={clsx("grid auto-rows-min items-start gap-2 p-2 pr-0", {
            "overflow-y-auto": !isFullscreen
          })}
        >
          {!isLeftPanelCollapse ? (
            <>
              <GlobalInfo />
              <Options />
              {analyzerData.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
              <SearchCard />
            </>
          ) : null}
          {!isFullscreen ? (
            <div
              className={cn("absolute z-10 justify-self-end", {
                "left-0": isLeftPanelCollapse
              })}
            >
              <button
                type="button"
                onClick={() => setIsLeftPanelCollapse(!isLeftPanelCollapse)}
                className={clsx(
                  "btn btn--primary absolute left-0 top-[50vh] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-0",
                  {
                    "left-arrow-space": !isLeftPanelCollapse
                  }
                )}
              >
                <Icon path={isLeftPanelCollapse ? mdiChevronRight : mdiChevronLeft} size={1} />
              </button>
            </div>
          ) : null}
        </aside>

        <main className="grid h-full min-w-[100px] grid-rows-[auto,1fr] gap-2 overflow-y-hidden p-2">
          <header className="grid grid-flow-col items-center justify-between gap-2">
            <Breadcrumb />
            <FullscreenButton setIsFullscreen={setIsFullscreen} isFullscreen={isFullscreen} />
          </header>
          {client ? <ChartWrapper hoveredObject={hoveredObject} setHoveredObject={setHoveredObject} /> : <div />}
        </main>

        <aside
          className={clsx("grid auto-rows-min items-start gap-2 p-2 pl-0", {
            "overflow-y-auto": !isFullscreen
          })}
        >
          {!isFullscreen ? (
            <div className="absolute z-10">
              <button
                type="button"
                onClick={() => setIsRightPanelCollapse(!isRightPanelCollapse)}
                className="btn btn--primary absolute right-0 top-[50vh] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-0"
              >
                <Icon path={isRightPanelCollapse ? mdiChevronLeft : mdiChevronRight} size={1} />
              </button>
            </div>
          ) : null}
          {!isRightPanelCollapse ? (
            <>
              {gitTruckInfo.latestVersion && semverCompare(gitTruckInfo.latestVersion, gitTruckInfo.version) === 1 ? (
                <UpdateNotifier />
              ) : null}
              <DetailsCard
                className={clsx({
                  "absolute bottom-0 right-2 max-h-screen -translate-x-full overflow-y-auto shadow shadow-black/50":
                    isFullscreen
                })}
                showUnionAuthorsModal={showUnionAuthorsModal}
              />
              <Legend hoveredObject={hoveredObject} showUnionAuthorsModal={showUnionAuthorsModal} />
              <Online>
                <FeedbackCard />
              </Online>
            </>
          ) : null}
        </aside>
      </div>
      <UnionAuthorsModal
        open={unionAuthorsModalOpen}
        onClose={() => {
          setUnionAuthorsModalOpen(false)
        }}
      />
    </Providers>
  )
}

const FullscreenButton = memo(function FullscreenButton({
  setIsFullscreen,
  isFullscreen
}: {
  setIsFullscreen: Dispatch<SetStateAction<boolean>>
  isFullscreen: boolean
}) {
  return (
    <button
      className="card btn btn--primary p-1"
      onClick={() => setIsFullscreen((isFullscreen) => !isFullscreen)}
      title="Toggle full view"
    >
      <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
    </button>
  )
})

function ChartWrapper({
  hoveredObject,
  setHoveredObject
}: {
  hoveredObject: HydratedGitObject | null
  setHoveredObject: (obj: HydratedGitObject | null) => void
}) {
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLElement>(document.body)
  const mouse = useMouse(bodyRef)

  return (
    <div className="card grid overflow-y-hidden p-2" ref={chartWrapperRef}>
      <Chart setHoveredObject={setHoveredObject} />
      {createPortal(
        <Tooltip hoveredObject={hoveredObject} x={mouse.docX} y={mouse.docY} w={window.innerWidth} />,
        document.body
      )}
    </div>
  )
}
