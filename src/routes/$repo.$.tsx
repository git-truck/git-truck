import { mdiChevronLeft, mdiChevronRight, mdiFullscreen, mdiFullscreenExit } from "@mdi/js"
import Icon from "@mdi/react"
import { Await, isRouteErrorResponse, useLoaderData, useRouteError, Link } from "react-router"
import clsx from "clsx"
import { resolve } from "path"
import randomstring from "randomstring"
import { Suspense, useEffect, useReducer, useState } from "react"
import { Online } from "react-detect-offline"
import { createPortal, flushSync } from "react-dom"
import { useClient, useFullscreen } from "~/hooks"
import { GitCaller } from "~/analyzer/git-caller.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { DatabaseInfo, GitObject, RepoData } from "~/shared/model"
import { shouldUpdate } from "~/shared/RefreshPolicy"
import { getArgs, openFile } from "~/shared/util.server"
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
import { ErrorPage } from "~/components/util"

import { cn } from "~/styling"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/$repo.$"

export const loader = async ({ params, context }: Route.LoaderArgs) => ({
  dataPromise: analyze({ repo: params.repo, branch: params["*"] }),
  versionInfo: context
})

export const action = async ({ request, params: { repo, "*": branch } }: Route.ActionArgs) => {
  const formData = await request.formData()
  const refresh = formData.get("refresh")
  const unignore = formData.get("unignore")
  const ignore = formData.get("ignore")
  const fileToOpen = formData.get("open")
  const unionedAuthors = formData.get("unionedAuthors")
  const rerollColors = formData.get("rerollColors")
  const timeseries = formData.get("timeseries")
  const authorname = formData.get("authorname")
  const authorcolor = formData.get("authorcolor")

  const args = await getArgs()
  const path = resolve(args.path, repo)
  const instance = InstanceManager.getOrCreateInstance(repo, branch, path) // TODO fix the branch and check path works
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

  if (typeof fileToOpen === "string") {
    instance.prevInvokeReason = "open"
    openFile(instance.repoPath, fileToOpen)
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
    const newSeed = randomstring.generate(6)
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
    await InstanceManager.getOrCreateMetadataDB().addAuthorColor(authorname, authorcolor as string)
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
    return <ErrorPage errorMessage={error.data.message} />
  }

  let errorMessage = "Unknown error"
  if (typeof error === "string") {
    errorMessage = error
  } else if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    errorMessage = error.message
  }

  return <ErrorPage errorMessage={errorMessage} />
}

async function analyze({ repo, branch }: { repo: string; branch: string }) {
  const args = await getArgs()
  const path = resolve(args.path, repo)
  const isRepo = await GitCaller.isGitRepo(path)
  if (!isRepo) throw new Error(`No repo found at ${path}`)
  const isValidRevision = await GitCaller.isValidRevision(branch, path)
  if (!isValidRevision) {
    throw new Error(
      `Invalid revision of repo ${repo}: ${branch}\nIf ${branch} is a remote branch, make sure it is pulled locally`
    )
  }

  const instance = InstanceManager.getOrCreateInstance(repo, branch, path)
  // to avoid double identical fetch at first load, which it does for some reason
  // TODO: Fix this. This is due to react strict mode
  if (instance.prevInvokeReason === "none" && instance.prevResult) {
    return instance.prevResult
  }
  await instance.loadRepoData()

  const timerange = await instance.db.getOverallTimeRange()
  const selectedRange = instance.db.selectedRange

  const repositoryMetadata = await GitCaller.getRepoMetadata(path)

  if (!repositoryMetadata) {
    throw Error("Error loading repo")
  }

  const reason = instance.prevInvokeReason
  instance.prevInvokeReason = "unknown"
  const prevData = instance.prevResult
  const prevRes = prevData?.databaseInfo

  log.time("fileTree")
  const filetree =
    prevRes && !shouldUpdate(reason, "filetree")
      ? { rootTree: prevRes.fileTree, fileCount: prevRes.fileCount }
      : await instance.analyzeTree()
  log.timeEnd("fileTree")

  if (!prevRes || shouldUpdate(reason, "rename")) {
    log.time("rename")
    await instance.updateRenames()
    log.timeEnd("rename")
  }

  log.time("updateCache")
  if (!prevRes || shouldUpdate(reason, "cache")) await instance.db.updateCachedResult()
  log.timeEnd("updateCache")
  log.time("dbQueries")
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
      : await InstanceManager.getOrCreateMetadataDB().getLastRun(instance.repo, instance.branch)
  const colorSeed = prevRes && !shouldUpdate(reason, "colorSeed") ? prevRes.colorSeed : await instance.db.getColorSeed()
  const authorColors =
    prevRes && !shouldUpdate(reason, "authorColors")
      ? prevRes.authorColors
      : await InstanceManager.getOrCreateMetadataDB().getAuthorColors()
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
      : await InstanceManager.getOrCreateMetadataDB().getCompletedRepos()
  log.timeEnd("dbQueries")

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

  const fullData: RepoData = { repo: repositoryMetadata, databaseInfo: databaseInfo }

  return fullData
}

export default function Repo() {
  const client = useClient()
  const { isFullscreen, toggleFullscreen } = useFullscreen(() => document.documentElement)
  const { dataPromise, versionInfo } = useLoaderData<typeof loader>()

  const [{ leftExpanded, rightExpanded }, dispatch] = useReducer(
    (prevState, action: "toggleLeft" | "toggleRight" | "collapseBoth" | "expandBoth") => {
      switch (action) {
        case "collapseBoth": {
          return { leftExpanded: false, rightExpanded: false }
        }
        case "expandBoth": {
          return { leftExpanded: true, rightExpanded: true }
        }
        case "toggleLeft": {
          return { leftExpanded: !prevState.leftExpanded, rightExpanded: prevState.rightExpanded }
        }
        case "toggleRight": {
          return { leftExpanded: prevState.leftExpanded, rightExpanded: !prevState.rightExpanded }
        }
      }
    },
    {
      leftExpanded: true,
      rightExpanded: true
    }
  )

  const toggleLeft = () => dispatch("toggleLeft")
  const toggleRight = () => dispatch("toggleRight")
  const collapseBoth = () => dispatch("collapseBoth")
  const expandBoth = () => dispatch("expandBoth")

  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useState(false)
  const [hoveredObject, setHoveredObject] = useState<GitObject | null>(null)
  const showUnionAuthorsModal = (): void => setUnionAuthorsModalOpen(true)

  const bothExpanded = leftExpanded && rightExpanded
  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
          <LoadingIndicator
            showProgress
            loadingText={
              <div className="flex flex-col items-center gap-2">
                Stuck? Try going back and clearing the cache:
                <Link to="/clear-cache" className="btn btn--primary">
                  Clear Cache
                </Link>
              </div>
            }
          />
        </div>
      }
    >
      <Await resolve={dataPromise}>
        {(data) => (
          <Providers data={data as RepoData}>
            <div
              className={cn(
                `grid grid-cols-1 transition-all [grid-template-areas:"main"_"left"_"right"] lg:h-screen lg:grid-cols-[0_1fr_0] lg:grid-rows-[1fr] lg:overflow-hidden lg:[grid-template-areas:"left_main_right"]`,
                bothExpanded ? "grid-rows-[50vh_auto_auto]" : "grid-rows-[100vh_auto_auto]",
                {
                  "lg:grid-cols-[var(--side-panel-width)_1fr_var(--side-panel-width)]": bothExpanded,

                  "lg:grid-cols-[0_1fr_var(--side-panel-width)]": rightExpanded && !leftExpanded,

                  "lg:grid-cols-[var(--side-panel-width)_1fr_0]": leftExpanded && !rightExpanded
                }
              )}
            >
              <aside
                className={clsx(
                  "grid auto-rows-min items-start gap-2 p-2 [grid-area:left] lg:pr-0 lg:transition-transform",
                  leftExpanded ? "overflow-y-auto" : "lg:-translate-x-[var(--side-panel-width)]"
                )}
              >
                {leftExpanded ? (
                  <>
                    <GlobalInfo
                      installedVersion={versionInfo.installedVersion}
                      latestVersion={versionInfo.latestVersion}
                    />
                    <Options />
                    <Legend hoveredObject={hoveredObject} showUnionAuthorsModal={showUnionAuthorsModal} />
                  </>
                ) : null}
              </aside>
              <main
                className={cn(
                  "relative grid h-full min-w-[100px] grid-rows-[auto_1fr] gap-2 overflow-y-hidden p-2 [grid-area:main] lg:transition-transform"
                )}
              >
                <header className="grid grid-flow-col items-center justify-between gap-2">
                  <Breadcrumb />
                  <button
                    className="card btn btn--primary p-1"
                    onClick={() =>
                      flushSync(() => {
                        toggleFullscreen()
                        isFullscreen ? expandBoth() : collapseBoth()
                      })
                    }
                    title="Toggle full view"
                  >
                    <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
                  </button>
                </header>
                <>
                  <button
                    type="button"
                    title="Collapse left panel"
                    onClick={toggleLeft}
                    className="btn--icon btn--primary card absolute top-1/2 left-0 z-10 hidden h-8 w-8 -translate-y-full cursor-pointer items-center justify-center rounded-r-full p-0 lg:flex"
                  >
                    <Icon path={leftExpanded ? mdiChevronLeft : mdiChevronRight} size={1} />
                  </button>
                  <button
                    type="button"
                    title="Collapse right panel"
                    onClick={toggleRight}
                    className="btn--icon btn--primary card absolute top-1/2 right-0 z-10 hidden h-8 w-8 -translate-y-full cursor-pointer items-center justify-center rounded-l-full p-0 lg:flex"
                  >
                    <Icon path={rightExpanded ? mdiChevronRight : mdiChevronLeft} size={1} />
                  </button>
                </>
                {client ? (
                  <>
                    <div className="card grid overflow-hidden p-2">
                      <Chart setHoveredObject={setHoveredObject} />
                      {createPortal(<Tooltip hoveredObject={hoveredObject} />, document.body)}
                      {!rightExpanded ? (
                        <DetailsCard
                          showUnionAuthorsModal={showUnionAuthorsModal}
                          className="absolute top-2 right-2 z-0 max-h-screen w-[var(--side-panel-width)] overflow-y-auto shadow-sm shadow-black/50"
                        />
                      ) : null}
                    </div>
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
                className={clsx(
                  "grid auto-rows-min items-start gap-2 p-2 [grid-area:right] lg:pl-0 lg:transition-transform",
                  rightExpanded ? "overflow-y-auto" : "lg:translate-x-[var(--side-panel-width)]"
                )}
              >
                {rightExpanded ? (
                  <>
                    <DetailsCard showUnionAuthorsModal={showUnionAuthorsModal} />
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
