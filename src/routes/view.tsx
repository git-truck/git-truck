import { mdiMenu } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Await, redirect, href, useNavigate, useFetcher, useNavigation, Link } from "react-router"
import clsx from "clsx"
import randomstring from "randomstring"
import { Activity, startTransition, Suspense, useCallback, useReducer } from "react"
import { createPortal } from "react-dom"
import { GitService } from "~/server/git-service"
import { AnalysisManager } from "~/server/AnalysisManager"
import type { DatabaseInfo, RepoData } from "~/shared/model"
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
import Timeline from "~/components/TimeSlider"
import { cn } from "~/styling"
import { log } from "~/server/log"
import type { Route } from "./+types/view"
import { RefreshButton } from "~/components/buttons/RefreshButton"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { ClientOnly } from "~/components/util"
import { FullscreenButton } from "~/components/buttons/FullscreenButton"
import { versionContext } from "~/root"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { createLoader, createSerializer, parseAsString } from "nuqs/server"
import { RevisionSelect } from "~/components/RevisionSelect"
import { SettingsButton } from "~/components/buttons/SettingsButton"
import { GroupAuthorsButton } from "~/components/buttons/GroupContributorsButton"
import { ResetTimeIntervalButton } from "~/components/buttons/ResetTimeIntervalButton"
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"
import { InspectPanel } from "~/components/inspection/InspectPanel"
import { Tooltip } from "~/components/Tooltip"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import { invariant } from "~/shared/util"
import { browseSerializer } from "~/routes/browse"
import { useQueryStates } from "nuqs"
import { abortSerializer } from "~/routes/api.abort"
import MetadataDB from "~/server/MetadataDB"

export const viewSearchParamsConfig = {
  path: parseAsString,
  objectPath: parseAsString,
  objectType: parseAsString,
  zoomPath: parseAsString,
  branch: parseAsString
}

export const viewSerializer = createSerializer(viewSearchParamsConfig)
export const loadViewSearchParams = createLoader(viewSearchParamsConfig)

export const meta = ({ loaderData }: Route.MetaArgs) => [
  {
    title: `${loaderData.repositoryName} - Git Truck`
  }
]

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const argsRepositoryPath = normalizeAndResolvePath(getArgsWithDefaults().path)

  const versionInfo = context.get(versionContext)

  const viewSearchParams = loadViewSearchParams(request)

  let { path, zoomPath, branch } = viewSearchParams

  // Redirect to browse if not a git repo
  if (path && !(await GitService.isValidGitRepo(path))) {
    const url = href("/browse") + browseSerializer({ path })
    log.warn(`Path ${path} is not a git repository, redirecting to ${url}`)
    throw redirect(url)
  }

  // Redirect to same page with required search params if they are missing
  if (!path || !branch || !zoomPath) {
    const redirectUrl = new URL(request.url)

    path ??= argsRepositoryPath
    branch ??= await GitService._getRepositoryHead(path)
    zoomPath ??= getRepoNameFromPath(path)

    redirectUrl.search = viewSerializer({
      path,
      branch,
      zoomPath
    })

    log.warn(`At least one required parameter is missing, redirecting to ${redirectUrl}`)

    throw redirect(redirectUrl.toString())
  }

  const parentDirectoryPath = getBaseDirFromPath(path)

  return {
    dataPromise: analyze({ path, branch: branch! }),
    repositoryName: getRepoNameFromPath(path),
    parentDirectoryPath,
    versionInfo
  }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const { path: repositoryPath, branch } = loadViewSearchParams(request)
  invariant(repositoryPath, "path is required")
  invariant(branch, "branch is required")

  const instance = await AnalysisManager.getInstance({ repositoryPath, branch })
  const formData = await request.formData()
  const refresh = formData.get("refresh")
  const groupedContributors = formData.get("groupedContributors")
  const rerollColors = formData.get("rerollColors")
  const timeseries = formData.get("timeseries")
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
    log.info("Ignoring path: " + hidePath)
    instance.prevInvokeReason = "hide"
    await instance.db.addHiddenFile(hidePath)

    return null
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

  if (typeof contributorName === "string") {
    instance.prevInvokeReason = "contributorColor"
    invariant(typeof contributorColor === "string", "contributorColor is required")
    await MetadataDB.getInstance().addContributorColor(contributorName, contributorColor)
    return null
  }

  return null
}

async function analyze({ path, branch }: { path: string; branch: string }) {
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

  log.time("fileTree")
  const filetree =
    prevRes && !shouldUpdate(reason, "fileTree")
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
  const { rootTree, fileCount } = filetree
  const hiddenFiles =
    prevRes && !shouldUpdate(reason, "hiddenFiles") ? prevRes.hiddenFiles : await instance.db.getHiddenFiles()
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
      : await instance.db.getCommitCountPerTime(timerange)
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

  const databaseInfo: DatabaseInfo = {
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

  const fetcher = useFetcher<typeof loader>()
  const navigation = useNavigation()
  const isLoading = navigation.state !== "idle"
  const isAborting = fetcher.state !== "idle"

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

  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
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
                `grid grid-cols-1 transition-all [grid-template-areas:"main"_"left"] lg:h-screen lg:grid-cols-[0_1fr] lg:grid-rows-[1fr] lg:overflow-hidden lg:[grid-template-areas:"left_main"]`,
                {
                  "lg:grid-cols-[var(--spacing-sidepanel)_1fr]": leftExpanded
                }
              )}
            >
              <Activity mode={leftExpanded ? "visible" : "hidden"}>
                <aside
                  className={clsx(
                    "*:not-first:m-2 lg:transition-transform",
                    leftExpanded ? "overflow-y-auto [grid-area:left]" : "lg:-translate-x-sidepanel"
                  )}
                >
                  <div className="bg-primary-bg dark:bg-primary-bg-dark sticky top-0 z-10 flex justify-between p-2">
                    <GitTruckInfo
                      className=""
                      installedVersion={versionInfo.installedVersion}
                      latestVersion={versionInfo.latestVersion}
                    />
                    <button className="btn" title="Hide left panel" onClick={toggleLeft}>
                      <Icon path={mdiMenu} size="1.5em" />
                    </button>
                  </div>
                  <CollapsibleHeader
                    className="card"
                    title={<>Visualization options</>}
                    contentClassName="pb-6 flex flex-col gap-2"
                  >
                    <Options />
                  </CollapsibleHeader>
                  <InspectPanel />
                  <CommitsInspection />
                </aside>
              </Activity>
              <main
                className={cn(
                  "relative grid h-full min-h-screen min-w-25 grid-rows-[auto_1fr_auto] gap-2 p-2 [grid-area:main] lg:transition-transform"
                )}
              >
                <header className="grid grid-flow-col items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {!leftExpanded ? (
                      <button title="Show left panel" className="btn btn--text aspect-square" onClick={toggleLeft}>
                        <Icon path={mdiMenu} size={1} />
                      </button>
                    ) : null}
                    <Breadcrumb zoom />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <SearchCard />
                    </div>
                    {data.repo.status === "Success" ? (
                      <RevisionSelect
                        key={data.databaseInfo.branch}
                        className="max-w-32"
                        title="Select branch"
                        defaultValue={data.databaseInfo.branch}
                        headGroups={data.repo.refs}
                        analyzedBranches={data.databaseInfo.analyzedRepos.filter(
                          (rep) => rep.repositoryPath === data.databaseInfo.repo
                        )}
                        onChange={(e) =>
                          navigate(
                            href("/view") + viewSerializer({ path: data.repo.repositoryPath, branch: e.target.value })
                          )
                        }
                      />
                    ) : (
                      <div />
                    )}
                    <RefreshButton />
                    <HideFilesButton />
                    <GroupAuthorsButton compact />
                    <SettingsButton />
                    <FullscreenButton />
                  </div>
                </header>

                <div className="grid">
                  <ClientOnly>
                    {() => (
                      <>
                        <Suspense
                          fallback={
                            <div className="grid h-screen place-items-center">
                              <LoadingIndicator showProgress />
                            </div>
                          }
                        >
                          <Await resolve={dataPromise}>{() => (isLoading ? <LoadingIndicator /> : <Chart />)}</Await>
                        </Suspense>
                        {createPortal(<Tooltip />, document.body)}
                      </>
                    )}
                  </ClientOnly>
                </div>
                <div className="flex flex-col text-center select-none">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="card__title">Commits per {data.databaseInfo.commitCountPerTimeIntervalUnit}</h2>
                    {/* TODO: Add presets, like "Last 24 hours, last 7 days, last 30 days, last years etc." */}
                    <ResetTimeIntervalButton />
                  </div>
                  <Timeline key={`${data.databaseInfo.selectedRange[0]}-${data.databaseInfo.selectedRange[1]}`} />
                </div>
              </main>
            </div>
          </Providers>
        )}
      </Await>
    </Suspense>
  )
}
