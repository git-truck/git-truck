import { viewSearchParamsConfig, loadViewSearchParams, viewSerializer } from "~/routes/viewParams"
import { mdiMenu, mdiMenuOpen } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Await, redirect, href, useNavigate, useFetcher, Link, useNavigation } from "react-router"
import clsx from "clsx"
import randomstring from "randomstring"
import { Activity, startTransition, Suspense, useCallback, useReducer } from "react"
import { createPortal } from "react-dom"
import { GitService } from "~/server/git-service"
import { AnalysisManager } from "~/server/AnalysisManager"
import { type DatabaseInfo, type RepoData } from "~/shared/model"
import { type TimeUnit } from "~/shared/utils/time"
import { shouldUpdate } from "~/shared/RefreshPolicy"
import {
  getArgsWithDefaults,
  getBaseDirFromPath,
  getRepoNameFromPath,
  normalizeAndResolvePath,
  openFile
} from "~/shared/util.server"
import { Breadcrumb } from "~/components/Breadcrumb"
import { Chart } from "~/components/Chart"
import { HideFilesButton } from "~/components/buttons/HideFilesButton"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import { SearchCard } from "~/components/SearchCard"
import { Timeline } from "~/components/TimeSlider"
import { cn } from "~/styling"
import { log } from "~/server/log"
import type { Route } from "./+types/view"
import { RefreshButton } from "~/components/buttons/RefreshButton"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { ClientOnly } from "~/components/util"
import { FullscreenButton } from "~/components/buttons/FullscreenButton"
import { versionContext } from "~/root"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { SettingsButton } from "~/components/buttons/SettingsButton"
import { GroupAuthorsButton } from "~/components/buttons/GroupContributorsButton"
import { InspectPanel } from "~/components/inspection/InspectPanel"
import { Tooltip } from "~/components/Tooltip"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import { $inspect, dateFormatShort, invariant } from "~/shared/util"
import { browseSerializer } from "~/routes/browse"
import { useQueryStates } from "nuqs"
import { abortSerializer } from "~/routes/api.abort"
import MetadataDB from "~/server/MetadataDB"
import { useMediaQuery } from "~/hooks"
import { InteractionButtons, MetricsInspection } from "~/components/inspection/MetricsInspection"
import { CompactLoadingIndicator } from "~/components/CompactLoadingIndicator"

export const meta = ({ loaderData }: Route.MetaArgs) => [
  {
    title: `${loaderData.repositoryName} - Git Truck`
  }
]

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const argsRepositoryPath = normalizeAndResolvePath(getArgsWithDefaults().path)

  const versionInfo = context.get(versionContext)

  const viewSearchParams = loadViewSearchParams(request)

  let { path, zoomPath, branch, start, end } = viewSearchParams
  const { timeUnit, objectPath } = viewSearchParams

  // Redirect to browse if not a git repo
  if (path && !(await GitService.isValidGitRepo(path))) {
    const url = href("/browse") + browseSerializer({ path })
    log.warn(`Path ${path} is not a git repository, redirecting to ${url}`)
    throw redirect(url)
  }

  // Redirect to same page with required search params if any are missing
  if (!path || !branch || !zoomPath) {
    log.warn(`At least one required parameter is missing, redirecting`)
    log.warn({
      viewSearchParams,
      path,
      branch,
      zoomPath,
      objectPath
    })

    const redirectUrl = new URL(request.url)

    path ??= argsRepositoryPath
    branch ??= await GitService._getRepositoryHead(path)
    zoomPath ??= getRepoNameFromPath(path)

    redirectUrl.search = viewSerializer({
      path,
      branch,
      zoomPath
    })

    throw redirect(redirectUrl.toString())
  }

  const parentDirectoryPath = getBaseDirFromPath(path)

  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch: branch })

  if (!start || !end || !instance.db.selectedRange[0] || !instance.db.selectedRange[1]) {
    const [min, max] = await instance.db.getOverallTimeRange()
    start ??= min ?? 0
    end ??= max ?? 1_000_000_000_000
    instance.db.selectedRange = [start, end]
  }

  let shouldUpdateTimeSeries = false

  if (end && end !== instance.db.selectedRange[1]) {
    instance.prevInvokeReason = "timeseriesend"
    shouldUpdateTimeSeries = true
  } else if (start && start !== instance.db.selectedRange[0]) {
    instance.prevInvokeReason = "timeseriesstart"
    shouldUpdateTimeSeries = true
  } else {
    instance.prevInvokeReason = "none"
  }

  if (shouldUpdateTimeSeries) {
    await instance.updateTimeInterval(start!, end!)
  }

  return {
    dataPromise: analyze({
      path,
      branch: branch!,
      objectPath: objectPath ?? undefined,
      zoomPath,
      timeUnit: timeUnit ?? undefined
    }),
    repositoryName: getRepoNameFromPath(path),
    parentDirectoryPath,
    versionInfo
  }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const viewSearchParams = loadViewSearchParams(request, {
    strict: true
  })
  const { path: repositoryPath, branch } = viewSearchParams
  invariant(repositoryPath, "path is required")
  invariant(branch, "branch is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath, branch })
  const formData = await request.formData()
  const refresh = formData.get("refresh")
  const groupedContributors = formData.get("groupedContributors")
  const rerollColors = formData.get("rerollColors")
  const contributorName = formData.get("contributorName")
  const contributorColor = formData.get("contributorColor")
  const hidePath = formData.get("hide") as string | null
  const unhidePath = formData.get("show") as string | null
  const unhideAll = formData.get("unhideAll") as string | null
  const openPath = formData.get("open") as string | null

  instance.prevInvokeReason = "unknown"
  if (refresh) {
    instance.prevInvokeReason = "refresh"
    return null
  }

  if (hidePath && typeof hidePath === "string") {
    instance.prevInvokeReason = "hide"
    await instance.db.addHiddenFile(hidePath)
    const { objectPath: _, ...params } = viewSearchParams
    throw redirect(href("/view") + viewSerializer(params))
  }

  if (unhidePath && typeof unhidePath === "string") {
    instance.prevInvokeReason = "show"
    await instance.db.removeHiddenFile(unhidePath)
    return null
  }

  if (unhideAll && typeof unhideAll === "string") {
    instance.prevInvokeReason = "hide"
    await instance.db.clearHiddenFiles()
    return null
  }

  if (typeof openPath === "string") {
    instance.prevInvokeReason = "open"
    openFile(repositoryPath, openPath)
    return null
  }

  if (typeof groupedContributors === "string") {
    instance.prevInvokeReason = "groupedContributors"
    const groups = JSON.parse(groupedContributors)
    await instance.db.replaceContributorGroups(groups)
    return null
  }

  if (typeof rerollColors === "string") {
    instance.prevInvokeReason = "rerollColors"
    const newSeed = randomstring.generate(6)
    await instance.db.updateColorSeed(newSeed)
    return null
  }

  // let shouldUpdateTimeSeries = false

  // if (end && end !== instance.prevResult?.databaseInfo.selectedRange[1]) {
  //   instance.prevInvokeReason = "timeseriesend"
  //   shouldUpdateTimeSeries = true
  // } else if (start && start !== instance.prevResult?.databaseInfo.selectedRange[0]) {
  //   instance.prevInvokeReason = "timeseriesstart"
  //   shouldUpdateTimeSeries = true
  // } else {
  //   instance.prevInvokeReason = "none"
  //   return null
  // }

  // if (shouldUpdateTimeSeries) {
  //   await instance.updateTimeInterval(start!, end!)
  //   return null
  // }

  if (typeof contributorName === "string") {
    instance.prevInvokeReason = "contributorColor"
    invariant(typeof contributorColor === "string", "contributorColor is required")
    await MetadataDB.getInstance().addContributorColor(contributorName, contributorColor)
    return null
  }

  return null
}

async function analyze({
  path,
  branch,
  objectPath,
  zoomPath,
  timeUnit
}: {
  path: string
  branch: string
  objectPath?: string
  zoomPath: string
  timeUnit?: TimeUnit
}) {
  const instance = await AnalysisManager.getInstance({ repositoryPath: path, branch: branch })

  const repo = path.split("/").pop()!
  const isRepo = await GitService.isValidGitRepo(path)
  if (!isRepo) throw new Error(`No repo found at ${path}`)
  const isValidRevision = await GitService.isValidRevision({ repositoryPath: path, revision: branch })
  if (!isValidRevision) {
    throw new Error(
      `Invalid revision of repo ${repo}: ${branch}. If ${branch} is a remote branch, make sure it is pulled locally`
    )
  }

  // // to avoid double identical fetch at first load, which it does for some reason
  // // TODO: Fix this. This is due to react strict mode
  if (instance.prevInvokeReason === "none" && instance.prevResult) {
    return instance.prevResult
  }

  await instance.loadRepoData()

  const timerange = await instance.db.getOverallTimeRange()
  const selectedRange = instance.db.selectedRange

  const repositoryMetadata = await GitService.getRepoMetadata(path)

  if (!repositoryMetadata) {
    throw Error("Error loading repo")
  }

  const reason = instance.prevInvokeReason
  instance.prevInvokeReason = "unknown"
  const prevData = instance.prevResult
  const prevRes = prevData?.databaseInfo

  if (!prevRes || shouldUpdate(reason, "rename")) {
    log.time("rename")
    await instance.updateRenames()
    log.timeEnd("rename")
  }

  const hiddenFiles =
    prevRes && !shouldUpdate(reason, "hiddenFiles") ? prevRes.hiddenFiles : await instance.db.getHiddenFiles()

  log.time("fileTree")
  const filetree =
    prevRes && !shouldUpdate(reason, "fileTree")
      ? {
          rootTree: prevRes.fileTree,
          objectPathMap: prevRes.objectPathMap,
          fileCount: prevRes.fileCount
        }
      : await instance.analyzeTree({ hiddenFiles })
  log.timeEnd("fileTree")

  const { rootTree, objectPathMap, fileCount } = filetree

  log.time("updateCache")
  if (!prevRes || shouldUpdate(reason, "cache")) await instance.db.updateCachedResult()
  log.timeEnd("updateCache")
  log.time("dbQueries")
  const topContributors =
    prevRes && !shouldUpdate(reason, "topContributor")
      ? prevRes.topContributors
      : await instance.db.getTopContributorPerFile()
  const commitCounts =
    prevRes && !shouldUpdate(reason, "commitCounts") ? prevRes.commitCounts : await instance.db.getCommitCountPerFile()
  const fileSizes =
    prevRes && !shouldUpdate(reason, "fileSizes") ? prevRes.fileSizes : await instance.db.getFileSizePerFile()

  const lastChanged =
    prevRes && !shouldUpdate(reason, "lastChanged") ? prevRes.lastChanged : await instance.db.getLastChangedPerFile()
  const authorCounts =
    prevRes && !shouldUpdate(reason, "contributorCounts")
      ? prevRes.contributorCounts
      : await instance.db.getContributorCountPerFile()
  const { maxCommitCount, minCommitCount } =
    prevRes && !shouldUpdate(reason, "maxMinCommitCount")
      ? { maxCommitCount: prevRes.maxCommitCount, minCommitCount: prevRes.minCommitCount }
      : await instance.db.getMaxAndMinCommitCount()
  const { newestChangeDate, oldestChangeDate } =
    prevRes && !shouldUpdate(reason, "newestOldestChangeDate")
      ? { newestChangeDate: prevRes.newestChangeDate, oldestChangeDate: prevRes.oldestChangeDate }
      : await instance.db.getNewestAndOldestChangeDates()
  const { minFileSize, maxFileSize } =
    prevRes && !shouldUpdate(reason, "maxMinFileSize")
      ? { minFileSize: prevRes.minFileSize, maxFileSize: prevRes.maxFileSize }
      : await instance.db.getMaxAndMinFileSize()
  const authors =
    prevRes && !shouldUpdate(reason, "contributors") ? prevRes.contributors : await instance.db.getAuthors()
  const authorUnions =
    prevRes && !shouldUpdate(reason, "groupedContributors")
      ? prevRes.contributorGroups
      : await instance.db.getAuthorUnions()
  const lastRunInfo =
    prevRes && !shouldUpdate(reason, "lastRunInfo")
      ? prevRes.lastRunInfo
      : await MetadataDB.getInstance().getLastRun({
          repositoryPath: instance.repositoryPath,
          branch: instance.branch
        })
  const colorSeed = prevRes && !shouldUpdate(reason, "colorSeed") ? prevRes.colorSeed : await instance.db.getColorSeed()
  const contributorColors =
    prevRes && !shouldUpdate(reason, "contributorColors")
      ? prevRes.contributorColors
      : await MetadataDB.getInstance().getContributorColors()
  const [commitCountPerTimeInterval, commitCountPerTimeIntervalUnit] =
    prevRes && !shouldUpdate(reason, "commitCountPerDay")
      ? ([prevRes.commitCountPerTimeInterval, prevRes.commitCountPerTimeIntervalUnit] as const)
      : await instance.db.getCommitCountPerTime(timerange, timeUnit)
  const contribCounts =
    prevRes && !shouldUpdate(reason, "contribSumPerFile")
      ? prevRes.contribSumPerFile
      : await instance.db.getContribSumPerFile()
  const contributorsForPath =
    prevRes && !shouldUpdate(reason, "contributorsForPath")
      ? prevRes.contributorsForPath
      : await instance.db.getContributorContributionsForPath()
  const maxMinContribCounts =
    prevRes && !shouldUpdate(reason, "maxMinContribCounts")
      ? prevRes.maxMinContribCounts
      : await instance.db.getMaxMinContribCounts()
  const commitCount =
    prevRes && !shouldUpdate(reason, "commitCount") ? prevRes.commitCount : await instance.db.getCommitCount()
  const analyzedRepos =
    prevRes && !shouldUpdate(reason, "analyzedRepos")
      ? prevRes.analyzedRepos
      : await MetadataDB.getInstance().getCompletedRepos()
  log.timeEnd("dbQueries")

  objectPath ??= objectPathMap[zoomPath]?.path ?? objectPathMap[getRepoNameFromPath(path)].path
  const objectHash = (objectPath ? objectPathMap[objectPath]?.hash : null) ?? getRepoNameFromPath(path)

  const commitCountPerTimeIntervalForClickedObject =
    objectHash && objectHash !== (await instance.gitService.revParse(instance.branch))
      ? await instance.db.getCommitCountPerTimeForClickedObject({ timerange, timeUnit, objectPath })
      : []

  const topContributorData = await instance.db.getContributorDistributionForPath(objectPath)

  const objIsBlob = (await instance.db.getObjectTypeFromPath(objectPath)) === "blob"

  const clickedObject =
    prevRes && !shouldUpdate(reason, "clickedObjectData")
      ? prevRes.clickedObjectInfo
      : {
          path: objectPath,
          existsInRange: await instance.db.pathExistsInSelectedRange(objectPath, objIsBlob),
          topContributor: topContributorData,
          multiTopContributors:
            topContributorData.length > 1 && topContributorData[0].contribs === topContributorData[1].contribs,
          amountOfCommits: await instance.db.getCommitCountForPath(objectPath),
          contributors: await instance.db.getUniqueContributorsForPath(objectPath),
          contributions: await instance.db.getContributionsForPath(objectPath),
          lastChanged: await instance.db.getLastChangedForPath(objectPath)
        }

  const databaseInfo: DatabaseInfo = {
    zoomPathName: getRepoNameFromPath(zoomPath),
    clickedObjectInfo: clickedObject,
    topContributors,
    commitCounts,
    fileSizes,
    lastChanged,
    contributorCounts: authorCounts,
    maxCommitCount,
    minCommitCount,
    newestChangeDate,
    oldestChangeDate,
    minFileSize,
    maxFileSize,
    contributors: authors,
    contributorGroups: authorUnions,
    fileTree: rootTree,
    objectPathMap,
    fileCount,
    hiddenFiles,
    lastRunInfo: lastRunInfo ?? { time: 0, hash: "" },
    repo: instance.repositoryName,
    branch,
    timerange,
    colorSeed,
    selectedRange,
    contributorColors: contributorColors,
    commitCountPerTimeInterval,
    commitCountPerTimeIntervalForClickedObject,
    commitCountPerTimeIntervalUnit,
    analyzedRepos,
    contribSumPerFile: contribCounts,
    contributorsForPath: contributorsForPath,
    maxMinContribCounts,
    commitCount
  }

  const fullData: RepoData = { repo: repositoryMetadata, databaseInfo: databaseInfo }
  return fullData
}

export default function Repo({ loaderData: { parentDirectoryPath, versionInfo, dataPromise } }: Route.ComponentProps) {
  const [{ leftExpanded }, dispatch] = useReducer(
    (prevState, action: "toggleLeft") => {
      switch (action) {
        case "toggleLeft": {
          return { leftExpanded: !prevState.leftExpanded }
        }
      }
    },
    {
      leftExpanded: true
    }
  )

  const toggleLeft = () => dispatch("toggleLeft")

  const navigate = useNavigate()

  const navigation = useNavigation()
  const fetcher = useFetcher<typeof loader>()
  const isAborting = fetcher.state !== "idle"
  const isLoading = navigation.state === "loading"

  const browseParent = href("/browse") + browseSerializer({ path: parentDirectoryPath })
  const [params] = useQueryStates(viewSearchParamsConfig)

  const abort = useCallback(() => {
    startTransition(async () => {
      if (isAborting) return
      if (!params.branch || !params.path) return

      const abortUrl = href("/api/abort") + abortSerializer({ branch: params.branch, path: params.path })
      await fetcher.submit(null, { action: abortUrl, method: "post" })
      navigate(browseParent)
    })
  }, [isAborting, params.branch, params.path, fetcher, navigate, browseParent])

  const matchesLarge = useMediaQuery("(min-width: var(--breakpoint-large))")

  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center bg-slate-200 dark:bg-stone-800">
          <LoadingIndicator
            showProgress={!isAborting}
            loadingText={({ status }) => (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  {status !== "Aborted" && status !== "CommitHistoryProcessed" ? (
                    <button className="btn btn--text btn--danger" disabled={isAborting} onClick={abort}>
                      {isAborting ? "Aborting..." : "Abort"}
                    </button>
                  ) : (
                    <Link to={browseParent} className="btn btn--text">
                      Go back
                    </Link>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      }
    >
      <Await resolve={dataPromise}>
        {(data) => (
          <Providers data={data as RepoData}>
            <div
              className={cn(
                `min-h-100dvh bg-secondary-bg dark:bg-secondary-bg-dark grid grid-cols-2 grid-rows-[auto_100dvh_auto_auto] gap-x-1 gap-y-2 p-2 transition-all [grid-template-areas:"lheader_rheader"_"left_left"_"chart_chart"_"barchart_barchart"] lg:h-screen lg:grid-cols-[var(--spacing-sidepanel)_1fr] lg:grid-rows-[auto_1fr_auto] lg:overflow-hidden lg:pr-2 lg:[grid-template-areas:"rheader_rheader"_"chart_chart"_"barchart_barchart"]`,
                {
                  [`lg:[grid-template-areas:"lheader_rheader"_"left_chart"_"left_barchart"]`]:
                    leftExpanded && matchesLarge
                }
              )}
            >
              <header
                className={cn(
                  "bg-secondary-bg dark:bg-secondary-bg-dark flex grid-cols-3 items-center justify-between gap-2 pr-2 [grid-area:lheader]",
                  {
                    hidden: !leftExpanded
                  }
                )}
              >
                <GitTruckInfo
                  installedVersion={versionInfo.installedVersion}
                  latestVersion={versionInfo.latestVersion}
                />

                {matchesLarge && leftExpanded ? (
                  <button
                    title={leftExpanded ? "Hide left panel" : "Show left panel"}
                    className="btn btn--text aspect-square"
                    onClick={toggleLeft}
                  >
                    <Icon path={leftExpanded ? mdiMenuOpen : mdiMenu} size={1} />
                  </button>
                ) : (
                  <div />
                )}
              </header>
              <nav className="grid grid-cols-[1fr_auto_1fr] items-center justify-between gap-2 [grid-area:rheader]">
                <div className="flex items-center">
                  {matchesLarge && !leftExpanded ? (
                    <>
                      <button
                        title={leftExpanded ? "Hide left panel" : "Show left panel"}
                        className="btn btn--text aspect-square"
                        onClick={toggleLeft}
                      >
                        <Icon path={leftExpanded ? mdiMenuOpen : mdiMenu} size={1} />
                      </button>
                      <Icon
                        aria-hidden
                        path="M11,2 H13 V22 H11 Z"
                        size={1}
                        className="fill-primary-text dark:fill-primary-text-dark mx-0 align-middle opacity-20"
                      />
                    </>
                  ) : null}
                  <Breadcrumb zoom />
                </div>

                <CompactLoadingIndicator
                  className={cn("transition-opacity", {
                    "opacity-0": !isLoading
                  })}
                />

                <div className="flex justify-end">
                  <SearchCard />
                  <RefreshButton />
                  <HideFilesButton />
                  <GroupAuthorsButton compact />
                  <SettingsButton />
                  <FullscreenButton />
                </div>
              </nav>
              <Activity mode={leftExpanded || !matchesLarge ? "visible" : "hidden"}>
                <aside
                  className={clsx(
                    "grid grid-rows-[auto_1fr] flex-col gap-4 lg:transition-transform",
                    leftExpanded ? "[grid-area:left]" : "lg:-translate-x-sidepanel"
                  )}
                >
                  <div className="flex flex-col gap-2 px-2">
                    <h2 className="card__title">Visualization options</h2>
                    <Options key={leftExpanded ? "expanded" : "collapsed"} />
                  </div>
                  <div className="hover:scrollbar-thumb-primary-bg-dark/50 hover:dark:scrollbar-thumb-primary-bg/50 flex scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent scrollbar-gutter-stable flex-col gap-4 overflow-y-auto">
                    <CollapsibleHeader
                      title={() => (
                        <>
                          Actions <InspectPanel />
                        </>
                      )}
                      className="card flex flex-col gap-1 px-2"
                    >
                      <InteractionButtons />
                      {/* <div className="card rounded-xl">
                        <h3 className="card__title">Actions</h3>
                      </div> */}
                    </CollapsibleHeader>
                    <CollapsibleHeader
                      className="card"
                      title={() => (
                        <>
                          Metrics
                          <InspectPanel />
                        </>
                      )}
                    >
                      <MetricsInspection />
                    </CollapsibleHeader>
                    <CommitsInspection className="card" />
                  </div>
                </aside>
              </Activity>

              <div
                className={cn(
                  "bg-primary-bg dark:bg-primary-bg-dark relative grid h-full rounded-xl shadow-md [grid-area:chart] lg:transition-transform"
                )}
              >
                <ClientOnly>
                  {() => (
                    <>
                      <Chart />
                      {createPortal(<Tooltip />, document.body)}
                    </>
                  )}
                </ClientOnly>
              </div>
              <Timeline className="[grid-area:barchart]" />
            </div>
          </Providers>
        )}
      </Await>
    </Suspense>
  )
}
