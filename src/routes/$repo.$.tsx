import { mdiChevronLeft, mdiChevronRight, mdiFullscreen, mdiFullscreenExit } from "@mdi/js"
import Icon from "@mdi/react"
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node"
import {
  Await,
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Link,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError
} from "@remix-run/react"
import clsx from "clsx"
import { resolve } from "path"
import type { Dispatch, SetStateAction } from "react"
import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react"
import { Online } from "react-detect-offline"
import { createPortal } from "react-dom"
import { useMouse } from "react-use/esm"
import { getArgs } from "~/analyzer/args.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import InstanceManager from "~/analyzer/InstanceManager.client"
import type { CompletedResult, GitObject, GitTreeObject, Repository } from "~/analyzer/model"
import { shouldUpdate } from "~/analyzer/RefreshPolicy"
import { openFile } from "~/analyzer/util.server"
import BarChart from "~/components/BarChart"
import { Breadcrumb } from "~/components/Breadcrumb"
import { Chart } from "~/components/Chart"
import { DetailsCard } from "~/components/DetailsCard"
import { FeedbackCard } from "~/components/FeedbackCard"
import { GlobalInfo } from "~/components/GlobalInfo"
import { HiddenFiles } from "~/components/HiddenFiles"
import { Legend } from "~/components/legend/Legend"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import { SearchCard } from "~/components/SearchCard"
import TimeSlider from "~/components/TimeSlider"
import { Tooltip } from "~/components/Tooltip"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"
import { Code } from "~/components/util"
import { useClient } from "~/hooks"
import { cn } from "~/styling"
import { invariant } from "ts-invariant"
import { log } from "~/analyzer/log"
import { MetadataDBManager } from "~/analyzer/MetadataDbManager.server"

export interface RepoData {
  repo: Repository
  databaseInfo: DatabaseInfo
}

export interface DatabaseInfo {
  dominantAuthors: Record<string, { author: string; contribcount: number }>
  commitCounts: Record<string, number>
  lastChanged: Record<string, number>
  authorCounts: Record<string, number>
  maxCommitCount: number
  minCommitCount: number
  newestChangeDate: number
  oldestChangeDate: number
  authors: string[]
  authorUnions: string[][]
  fileTree: GitTreeObject
  hiddenFiles: string[]
  lastRunInfo: {
    time: number
    hash: string
  }
  fileCount: number
  repo: string
  branch: string
  timerange: [number, number]
  colorSeed: string | null
  authorColors: Record<string, `#${string}`>
  commitCountPerDay: { date: string; count: number }[]
  selectedRange: [number, number]
  analyzedRepos: CompletedResult[]
  contribSumPerFile: Record<string, number>
  maxMinContribCounts: { max: number; min: number }
  commitCount: number
}

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const args = await getArgs()

  if (!params["repo"] || !params["*"]) {
    return redirect("/")
  }
  log.debug(args.path)
  const path = resolve(args.path, params["repo"] ?? "")
  log.debug(`Resolved path: ${path}`)
  const branch = params["*"]
  const repoName = params["repo"]
  const isRepo = await GitCaller.isGitRepo(path)
  if (!isRepo) throw new Error(`No repo found at ${path}`)
  if (!repoName || !branch) throw new Error(`Invalid repo and branch: ${repoName} ${branch}`)
  const isValidRevision = await GitCaller.isValidRevision(branch, path)
  if (!isValidRevision)
    throw new Error(
      `Invalid revision of repo ${params["repo"]}: ${branch}\nIf it is a remote branch, make sure it is pulled locally`
    )
  const repo = await GitCaller.getRepoMetadata(path)
  invariant(repo)
  const rawContent = await new GitCaller(repo?.name, branch, path).lsTree(branch)
  log.debug("Got raw content")

  invariant(typeof context.version === "string", "Version is missing")
  invariant(typeof context.latestVersion === "string", "Latest version is missing")

  return {
    args,
    repo,
    branch,
    rawContent,
    gitTruckInfo: {
      version: context.version,
      latestVersion: context.latestVersion
    }
  }
}

export const clientLoader = async ({ serverLoader }: ClientLoaderFunctionArgs) => {
  console.log("client loader here")
  const { repo, branch, rawContent, gitTruckInfo } = await serverLoader<typeof loader>()
  console.log("Analyzing raw content from client loader")
  const dataPromise = analyze(repo as Repository, branch, rawContent)
  console.log(dataPromise)

  return {
    dataPromise,
    gitTruckInfo
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const fileToOpen = (await request.formData()).get("open")

  if (typeof fileToOpen === "string") {
    // instance.prevInvokeReason = "open"
    openFile(fileToOpen)
  }
}

export const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  // const data = await serverAction<typeof action>()
  if (!params["repo"]) {
    throw Error("This can never happen, since this route is only called if a repo exists in the URL")
  }

  const formData = await request.formData()
  const repo = formData.get("repo")?.toString()
  const branch = formData.get("branch")?.toString()
  const path = formData.get("path")?.toString()
  const baseDir = formData.get("basedir")
  const refresh = formData.get("refresh")
  const unignore = formData.get("unignore")
  const ignore = formData.get("ignore")
  const unionedAuthors = formData.get("unionedAuthors")
  const rerollColors = formData.get("rerollColors")
  const timeseries = formData.get("timeseries")
  const authorname = formData.get("authorname")
  const authorcolor = formData.get("authorcolor")

  invariant(repo)
  invariant(branch)
  invariant(path)
  invariant(baseDir)

  // const args = await getArgs()
  const instance = await InstanceManager.getOrCreateInstance(repo, branch ?? "", path) // TODO fix the branch and check path works
  // TODO: Readd
  instance.prevInvokeReason = "unknown"
  if (refresh) {
    instance.prevInvokeReason = "refresh"
    return null
  }

  if (ignore && typeof ignore === "string") {
    instance.prevInvokeReason = "ignore"
    const hidden = await instance.db.getHiddenFiles()
    hidden.push(ignore)
    await instance.db.replaceHiddenFiles(hidden)

    return null
  }

  if (unignore && typeof unignore === "string") {
    instance.prevInvokeReason = "unignore"
    const hidden = await instance.db.getHiddenFiles()
    await instance.db.replaceHiddenFiles(hidden.filter((path) => path !== unignore))
    return null
  }

  if (typeof unionedAuthors === "string") {
    instance.prevInvokeReason = "unionedAuthors"
    const json = JSON.parse(unionedAuthors) as string[][]
    await instance.db.replaceAuthorUnions(json)
    return null
  }

  if (typeof rerollColors === "string") {
    instance.prevInvokeReason = "rerollColors"
    const newSeed = Math.random().toString(36).substring(2, 15)
    await instance.db.updateColorSeed(newSeed)
    return null
  }

  if (typeof timeseries === "string") {
    const split = timeseries.split("-")
    const start = Number(split[0])
    const end = Number(split[1])

    if (end !== instance.prevResult?.databaseInfo.selectedRange[1]) {
      instance.prevInvokeReason = "timeseriesend"
    } else if (start !== instance.prevResult?.databaseInfo.selectedRange[0]) {
      instance.prevInvokeReason = "timeseriesstart"
    } else {
      instance.prevInvokeReason = "none"
      return null
    }

    await instance.updateTimeInterval(start, end)
    return null
  }

  if (typeof authorname === "string") {
    instance.prevInvokeReason = "authorcolor"
    await MetadataDBManager.getOrCreateMetadataDB().addAuthorColor(authorname, authorcolor as string)
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

async function analyze(repo: Repository, branch: string, rawContent: string): Promise<RepoData> {
  console.log("Getting or initializing instance")

  const instance = await InstanceManager.getOrCreateInstance(repo.name, branch, repo.path)
  // to avoid double identical fetch at first load, which it does for some reason
  if (instance.prevInvokeReason === "none" && instance.prevResult) {
    return instance.prevResult
  }
  await instance.loadRepoData()

  const timerange = await instance.db.getOverallTimeRange()
  const selectedRange = instance.db.selectedRange

  if (!repo) {
    throw Error("Error loading repo")
  }

  const reason = instance.prevInvokeReason
  instance.prevInvokeReason = "unknown"
  const prevData = instance.prevResult
  const prevRes = prevData?.databaseInfo

  console.time("fileTree")
  const filetree =
    prevRes && !shouldUpdate(reason, "filetree")
      ? { rootTree: prevRes.fileTree, fileCount: prevRes.fileCount }
      : await instance.analyzeTree(rawContent)
  console.timeEnd("fileTree")

  if (!prevRes || shouldUpdate(reason, "rename")) {
    console.time("rename")
    await instance.updateRenames()
    console.timeEnd("rename")
  }

  console.time("updateCache")
  if (!prevRes || shouldUpdate(reason, "cache")) await instance.db.updateCachedResult()
  console.timeEnd("updateCache")
  console.time("dbQueries")
  const dominantAuthors =
    prevRes && !shouldUpdate(reason, "dominantAuthor")
      ? prevRes.dominantAuthors
      : await instance.db.getDominantAuthorPerFile()
  const commitCounts =
    prevRes && !shouldUpdate(reason, "commitCounts") ? prevRes.commitCounts : await instance.db.getCommitCountPerFile()
  const lastChanged =
    prevRes && !shouldUpdate(reason, "lastChanged") ? prevRes.lastChanged : await instance.db.getLastChangedPerFile()
  const authorCounts =
    prevRes && !shouldUpdate(reason, "authorCounts") ? prevRes.authorCounts : await instance.db.getAuthorCountPerFile()
  const { maxCommitCount, minCommitCount } =
    prevRes && !shouldUpdate(reason, "maxMinCommitCount")
      ? { maxCommitCount: prevRes.maxCommitCount, minCommitCount: prevRes.minCommitCount }
      : await instance.db.getMaxAndMinCommitCount()
  const { newestChangeDate, oldestChangeDate } =
    prevRes && !shouldUpdate(reason, "newestOldestChangeDate")
      ? { newestChangeDate: prevRes.newestChangeDate, oldestChangeDate: prevRes.oldestChangeDate }
      : await instance.db.getNewestAndOldestChangeDates()
  const authors = prevRes && !shouldUpdate(reason, "authors") ? prevRes.authors : await instance.db.getAuthors()
  const authorUnions =
    prevRes && !shouldUpdate(reason, "authorunions") ? prevRes.authorUnions : await instance.db.getAuthorUnions()
  const { rootTree, fileCount } = filetree
  const hiddenFiles =
    prevRes && !shouldUpdate(reason, "hiddenfiles") ? prevRes.hiddenFiles : await instance.db.getHiddenFiles()
  const lastRunInfo =
    prevRes && !shouldUpdate(reason, "lastRunInfo")
      ? prevRes.lastRunInfo
      : await MetadataDBManager.getOrCreateMetadataDB().getLastRun(instance.repo, instance.branch)
  const colorSeed = prevRes && !shouldUpdate(reason, "colorSeed") ? prevRes.colorSeed : await instance.db.getColorSeed()
  const authorColors =
    prevRes && !shouldUpdate(reason, "authorColors")
      ? prevRes.authorColors
      : await MetadataDBManager.getOrCreateMetadataDB().getAuthorColors()
  const commitCountPerDay =
    prevRes && !shouldUpdate(reason, "commitCountPerDay")
      ? prevRes.commitCountPerDay
      : await instance.db.getCommitCountPerTime(timerange)
  const contribCounts =
    prevRes && !shouldUpdate(reason, "contribSumPerFile")
      ? prevRes.contribSumPerFile
      : await instance.db.getContribSumPerFile()
  const maxMinContribCounts =
    prevRes && !shouldUpdate(reason, "maxMinContribCounts")
      ? prevRes.maxMinContribCounts
      : await instance.db.getMaxMinContribCounts()
  const commitCount =
    prevRes && !shouldUpdate(reason, "commitCount") ? prevRes.commitCount : await instance.db.getCommitCount()
  const analyzedRepos =
    prevRes && !shouldUpdate(reason, "analyzedRepos")
      ? prevRes.analyzedRepos
      : await MetadataDBManager.getOrCreateMetadataDB().getCompletedRepos()
  console.timeEnd("dbQueries")

  const databaseInfo: DatabaseInfo = {
    dominantAuthors,
    commitCounts,
    lastChanged,
    authorCounts,
    maxCommitCount,
    minCommitCount,
    newestChangeDate,
    oldestChangeDate,
    authors,
    authorUnions,
    fileTree: rootTree,
    fileCount,
    hiddenFiles,
    lastRunInfo: lastRunInfo ?? ({} as { time: number; hash: string }),
    repo: instance.repo,
    branch,
    timerange,
    colorSeed,
    selectedRange,
    authorColors,
    commitCountPerDay,
    analyzedRepos,
    contribSumPerFile: contribCounts,
    maxMinContribCounts,
    commitCount
  }

  const fullData: RepoData = {
    repo,
    databaseInfo: databaseInfo
  }

  return fullData
}

export default function Repo() {
  const client = useClient()
  const loaderData = useLoaderData<typeof clientLoader>()
  const { dataPromise, gitTruckInfo } = loaderData
  const [isLeftPanelCollapse, setIsLeftPanelCollapse] = useState<boolean>(false)
  const [isRightPanelCollapse, setIsRightPanelCollapse] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useState(false)
  const [hoveredObject, setHoveredObject] = useState<GitObject | null>(null)
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

  if (!dataPromise || !gitTruckInfo) {
    return (
      <div className="grid h-screen place-items-center">
        <LoadingIndicator />
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
          <LoadingIndicator />
        </div>
      }
    >
      <Await resolve={dataPromise}>
        {(data) => (
          <Providers data={data as RepoData}>
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
                    <Legend hoveredObject={hoveredObject} showUnionAuthorsModal={showUnionAuthorsModal} />
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
                {client ? (
                  <>
                    <ChartWrapper hoveredObject={hoveredObject} setHoveredObject={setHoveredObject} />
                    <div className="flex flex-col">
                      <TimeSlider />
                      <BarChart />
                    </div>
                  </>
                ) : (
                  <div />
                )}
              </main>

              <aside
                className={clsx("grid auto-rows-min items-start gap-2 p-2 pl-0", {
                  "overflow-y-auto": !isFullscreen
                })}
              >
                {!isFullscreen ? (
                  <div className="absolute">
                    <button
                      type="button"
                      onClick={() => setIsRightPanelCollapse(!isRightPanelCollapse)}
                      className="btn btn--primary absolute right-0 top-[50vh] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-0"
                    >
                      <Icon path={isRightPanelCollapse ? mdiChevronLeft : mdiChevronRight} size={1} />
                    </button>
                  </div>
                ) : null}
                {!isRightPanelCollapse && !isFullscreen ? (
                  <>
                    <DetailsCard
                      showUnionAuthorsModal={showUnionAuthorsModal}
                      className={clsx({
                        "absolute bottom-0 right-2 max-h-screen -translate-x-full overflow-y-auto shadow shadow-black/50":
                          isFullscreen
                      })}
                    />
                    {data.databaseInfo.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
                    <SearchCard />
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
        )}
      </Await>
    </Suspense>
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
  hoveredObject: GitObject | null
  setHoveredObject: (obj: GitObject | null) => void
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
