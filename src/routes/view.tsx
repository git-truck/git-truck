import {
  viewSearchParamsConfig,
  loadViewSearchParams,
  viewSerializer,
  type ViewSearchParams
} from "~/shared/viewParams"
import { mdiMenu, mdiMenuClose, mdiMenuOpen } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Await, redirect, href, useNavigate, useFetcher, Link } from "react-router"
import clsx from "clsx"
import randomstring from "randomstring"
import { Activity, startTransition, Suspense, useCallback, useReducer } from "react"
import { createPortal } from "react-dom"
import { GitService } from "~/server/git-service"
import { AnalysisManager } from "~/server/AnalysisManager"
import { type ContributorGroup, type DatabaseInfo, type Ensure, type RepoData, type Person } from "~/shared/model"
import { nowInSeconds } from "~/shared/utils/time"
import { shouldUpdate } from "~/shared/RefreshPolicy"
import { getBaseDirFromPath, getRepoNameFromPath, normalizeAndResolvePath, openFile } from "~/shared/util.server"
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
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"
import { Tooltip } from "~/components/Tooltip"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import { invariant } from "~/shared/util"
import { browseSerializer } from "~/routes/browse"
import { useQueryStates } from "nuqs"
import { abortSerializer } from "~/routes/api.abort"
import MetadataDB from "~/server/MetadataDB"
import { useMediaQuery } from "~/hooks"
import { MetricsInspection } from "~/components/inspection/MetricsInspection"
import { InteractionButtons } from "~/components/inspection/InteractionButtons"
import { CompactLoadingIndicator } from "~/components/CompactLoadingIndicator"
import { parseArgsWithDefaults } from "~/shared/utils/args"
import { Legend } from "~/components/inspection/Legend"
import parkedTruck from "~/assets/parkedTruck_48x.png"
import gustavMugshot from "~/assets/gustav_mugshot.jpeg"
import ituLogo from "~/assets/itu.svg"
import jonasMugshot from "~/assets/jonas_mugshot.png"
import mirceaMugshot from "~/assets/mircea_mugshot.jpeg"
import qrCode from "~/assets/qr-code.svg"
import { autoBuildContributorGroups } from "~/components/modals/utils/autoBuildContributorGroups"
export const meta = ({ loaderData }: Route.MetaArgs) => [
  {
    title: `${loaderData.repositoryName} - Git Truck`
  }
]

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const argsRepositoryPath = normalizeAndResolvePath(parseArgsWithDefaults().path)

  const versionInfo = context.get(versionContext)

  const viewSearchParams = loadViewSearchParams(request)

  let { path, zoomPath, objectPath, branch, start, end } = viewSearchParams
  const { includeCoauthors, timeUnit } = viewSearchParams

  // Redirect to browse if not a git repo
  if (path && !(await GitService.isValidGitRepo(path))) {
    const url = href("/browse") + browseSerializer({ path })
    log.warn(`Path ${path} is not a git repository, redirecting to ${url}`)
    throw redirect(url)
  }

  // Redirect to same page with required search params if any are missing
  if (!path || !branch || !zoomPath || start === null || end === null) {
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
    zoomPath ||= getRepoNameFromPath(path)
    objectPath ??= getRepoNameFromPath(path)
    start ??= 0
    end ??= nowInSeconds()

    redirectUrl.search = viewSerializer({
      path,
      branch,
      zoomPath,
      objectPath,
      start,
      end,
      includeCoauthors
    })

    throw redirect(redirectUrl.toString())
  }

  const parentDirectoryPath = getBaseDirFromPath(path)

  return {
    dataPromise: analyze({
      path,
      branch,
      zoomPath,
      objectPath,
      start,
      end,
      includeCoauthors,
      timeUnit
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
  const hidePath = formData.get("hide")
  const replaceHiddenFiles = formData.get("replaceHiddenFiles")
  const unhidePath = formData.get("show")
  const unhideAll = formData.get("unhideAll")
  const openPath = formData.get("open")

  instance.prevInvokeReason = "unknown"
  if (refresh) {
    instance.prevInvokeReason = "refresh"
    return null
  }

  if (typeof replaceHiddenFiles === "string") {
    const hidePaths = formData
      .getAll("hidePath")
      .filter((path): path is string => typeof path === "string" && path.length > 0)

    instance.prevInvokeReason = "hide"
    await instance.db.clearHiddenFiles()
    for (const path of [...hidePaths].reverse()) {
      await instance.db.addHiddenFile(path)
    }
    return null
  }

  if (typeof hidePath === "string" && hidePath.length > 0) {
    instance.prevInvokeReason = "hide"
    await instance.db.addHiddenFile(hidePath)
    const { objectPath: _, ...params } = viewSearchParams
    throw redirect(href("/view") + viewSerializer(params))
  }

  if (typeof unhidePath === "string" && unhidePath.length > 0) {
    instance.prevInvokeReason = "show"
    await instance.db.removeHiddenFile(unhidePath)
    return null
  }

  if (typeof unhideAll === "string") {
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
    instance.invalidateTimeInterval()
    return null
  }

  if (typeof rerollColors === "string") {
    instance.prevInvokeReason = "rerollColors"
    const newSeed = randomstring.generate(6)
    await instance.db.updateColorSeed(newSeed)
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

async function analyze(
  params: Ensure<ViewSearchParams, "path" | "branch" | "zoomPath" | "start" | "end">
): Promise<RepoData> {
  const { path, branch, zoomPath, includeCoauthors, timeUnit } = params
  let { objectPath } = params

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

  if (
    instance.prevInvokeReason === "none" &&
    instance.prevResult &&
    instance.prevArgs &&
    instance.prevArgs.path === params.path &&
    instance.prevArgs.branch === params.branch &&
    instance.prevArgs.objectPath === params.objectPath &&
    instance.prevArgs.zoomPath === params.zoomPath &&
    instance.prevArgs.timeUnit === params.timeUnit &&
    instance.prevArgs.includeCoauthors === params.includeCoauthors &&
    instance.prevArgs.start === params.start &&
    instance.prevArgs.end === params.end
  ) {
    return instance.prevResult
  }

  await instance.loadRepoData()

  const timerange = await instance.db.getOverallTimeRange()

  const repositoryMetadata = await GitService.getRepoMetadata(path)

  if (!repositoryMetadata) {
    throw Error("Error loading repo")
  }

  let reason = instance.prevInvokeReason
  instance.prevInvokeReason = "unknown"
  const prevData = instance.prevResult
  const prevRes = prevData?.databaseInfo
  const prevArgs = instance.prevArgs

  if (prevArgs && (reason === "none" || reason === "unknown")) {
    if (prevArgs.zoomPath !== params.zoomPath) {
      reason = "zoomPath"
    }

    if (prevArgs.timeUnit !== params.timeUnit) {
      reason = "timeUnit"
    }

    if (prevArgs.includeCoauthors !== params.includeCoauthors) {
      reason = "includeCoAuthors"
    }

    if (prevArgs.objectPath !== params.objectPath) {
      reason = "clickedObject"
    }

    if (params.end !== null && params.end !== instance.prevArgs?.end) {
      reason = "timeseriesend"
    } else if (params.start !== null && params.start !== instance.prevArgs?.start) {
      reason = "timeseriesstart"
    }
  }

  const authors =
    prevRes && !shouldUpdate(reason, "contributors") ? prevRes.contributors : await instance.db.getAuthors()
  const storedAuthorUnions =
    prevRes && !shouldUpdate(reason, "groupedContributors")
      ? prevRes.contributorGroups
      : await instance.db.getAuthorUnions()
  const authorUnions = autoGroupRemainingContributors(authors, storedAuthorUnions)
  const contributorGroupsChanged = JSON.stringify(storedAuthorUnions) !== JSON.stringify(authorUnions)

  if (contributorGroupsChanged) {
    await instance.db.replaceContributorGroups(authorUnions)
    instance.invalidateTimeInterval()
  }

  using _timeInterval = await instance.withTimeInterval(params.start, params.end)
  const shouldUpdateHiddenFiles = !prevRes || shouldUpdate(reason, "hiddenFiles")
  const shouldUpdateSourceFileTree = !prevRes || shouldUpdate(reason, "fileTree")
  const shouldUpdateVisibleFileTree = shouldUpdateHiddenFiles || shouldUpdateSourceFileTree

  const hiddenFiles = shouldUpdateHiddenFiles ? await instance.db.getHiddenFiles() : prevRes.hiddenFiles

  log.time("fileTree")
  const sourceFileTree = shouldUpdateSourceFileTree ? await instance.analyzeTree() : await instance.getFileTree()
  const filetree =
    prevRes && !shouldUpdateVisibleFileTree
      ? {
          rootTree: prevRes.fileTree,
          fileCount: prevRes.fileCount
        }
      : instance.filterHiddenFilesFromTree(sourceFileTree.rootTree, hiddenFiles)
  log.timeEnd("fileTree")

  const { rootTree, fileCount } = filetree

  if (!prevRes || shouldUpdate(reason, "rename")) {
    log.time("rename")
    await instance.updateRenames()
    log.timeEnd("rename")
  }

  log.time("updateCache")
  if (!prevRes || shouldUpdate(reason, "cache") || contributorGroupsChanged) await instance.db.updateCachedResult()
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
      : await instance.db.getCommitCountPerTime(timerange, timeUnit ?? undefined, { includeCoauthors })
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

  objectPath ??= zoomPath || getRepoNameFromPath(path)

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
  instance.prevResult = fullData
  instance.prevArgs = params

  return fullData
}

function autoGroupRemainingContributors(authors: Person[], storedGroups: ContributorGroup[]): ContributorGroup[] {
  const groupedContributorIds = new Set(
    storedGroups.flatMap((group) => group.members).map((person) => `${person.name}\u0000${person.email ?? ""}`)
  )
  const ungroupedAuthors = authors.filter(
    (person) => !groupedContributorIds.has(`${person.name}\u0000${person.email ?? ""}`)
  )

  return [...storedGroups, ...autoBuildContributorGroups(ungroupedAuthors)]
}

export default function Repo({ loaderData: { parentDirectoryPath, versionInfo, dataPromise } }: Route.ComponentProps) {
  const [{ leftExpanded, rightExpanded, optionsRevision }, dispatch] = useReducer(
    (prevState, action: "toggleLeft" | "toggleRight") => {
      switch (action) {
        case "toggleLeft": {
          const leftExpanded = !prevState.leftExpanded
          return {
            leftExpanded,
            rightExpanded: prevState.rightExpanded,
            optionsRevision: prevState.optionsRevision + 1
          }
        }
        case "toggleRight": {
          const rightExpanded = !prevState.rightExpanded
          return {
            leftExpanded: prevState.leftExpanded,
            rightExpanded,
            optionsRevision: prevState.optionsRevision + 1
          }
        }
      }
    },
    {
      leftExpanded: true,
      rightExpanded: true,
      optionsRevision: 0
    }
  )

  const toggleLeft = () => dispatch("toggleLeft")
  const toggleRight = () => dispatch("toggleRight")

  const navigate = useNavigate()

  const fetcher = useFetcher<typeof loader>()
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

  const matchesLarge = useMediaQuery("(min-width: var(--breakpoint-large))")

  return (
    <Suspense
      fallback={
        <div className="grid place-items-center bg-slate-200 dark:bg-stone-800">
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
          <Providers data={data}>
            <div
              className={cn("poster-canvas relative flex flex-col overflow-hidden bg-white", {
                [`lg:[grid-template-areas:"lheader_cheader_rheader"_"left_chart_chart"_"left_barchart_barchart"]`]:
                  leftExpanded && !rightExpanded,
                [`lg:[grid-template-areas:"cheader_cheader_rheader"_"chart_chart_right"_"barchart_barchart_right"]`]:
                  rightExpanded && !leftExpanded,
                [`lg:[grid-template-areas:"lheader_cheader_rheader"_"left_chart_right"_"left_barchart_right"]`]:
                  leftExpanded && rightExpanded,
                [`lg:[grid-template-areas:"cheader_cheader_rheader"_"chart_chart_chart"_"barchart_barchart_barchart"]`]:
                  !leftExpanded && !rightExpanded
              })}
              style={{
                width: 9_933,
                height: 14_043
              }}
            >
              <header
                className="relative grid shrink-0 grid-cols-[760px_1fr_3227px] items-start bg-white pt-[220px] pr-0 pl-[210px]"
                style={{ height: 2264 }}
              >
                <img
                  src={parkedTruck}
                  alt=""
                  className="pixelated shrink-0"
                  style={{
                    width: 760,
                    height: 760
                  }}
                />
                <div
                  className="absolute top-[430px] left-[1100px] z-10 text-[#374151]"
                  style={{ fontSize: 250, lineHeight: 1.15 }}
                >
                  <h1 className="montserrat-500 m-0">Git-Truck@Pluck</h1>
                </div>
                <div
                  className="absolute top-[220px] right-[220px] flex w-[3227px] flex-col items-end text-right text-[#7d7d7d]"
                  style={{ fontSize: 200 }}
                >
                  <img src={ituLogo} alt="IT University of Copenhagen" className="mb-[180px] h-[260px] w-[2371px]" />
                </div>
              </header>

              <div
                className="absolute top-[1649px] left-[213px] z-10 w-[5544px]"
                aria-label="Exploring where and when developers collaborate"
              >
                <div
                  aria-hidden="true"
                  className="montserrat-500 absolute inset-0 m-0 text-white"
                  style={{ fontSize: 390, lineHeight: 1.15, letterSpacing: "-14px" }}
                >
                  Exploring <em>where</em> and <em>when</em> developers collaborate
                </div>
                <h1 className="montserrat-300 relative m-0 text-[#374151]" style={{ fontSize: 379, lineHeight: 1.15 }}>
                  Exploring <em className="montserrat-500">where</em> and{" "}
                  <em className="montserrat-500">when</em> developers collaborate
                </h1>
              </div>

              <div className={cn("relative min-h-0 flex-1 overflow-hidden bg-white")}>
                <ClientOnly>
                  {() => (
                    <div className="absolute inset-x-[200px] -top-[300px] bottom-0 overflow-hidden">
                      <div className="origin-top-left scale-[0.95]">
                        <Chart poster />
                      </div>

                      <div
                        className="absolute top-[1800px] left-[900px] z-10 max-w-[1800px] rounded-lg border-4 border-[#374151] bg-white/95 px-[80px] py-[50px] text-[#374151]"
                        style={{ fontSize: 150 }}
                      >
                        <strong className="montserrat-500">Benedict owns this subsystem alone</strong>
                      </div>
                      <div
                        className="absolute top-[4300px] right-[900px] z-10 max-w-[1800px] rounded-lg border-4 border-[#374151] bg-white/95 px-[80px] py-[50px] text-[#374151]"
                        style={{ fontSize: 150 }}
                      >
                        <strong className="montserrat-500">Here, two contributors work together</strong>
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[900px] bg-linear-to-t from-white via-white/90 to-transparent" />
                      <div className="absolute right-[250px] bottom-[250px] z-10 w-[450px] origin-bottom-right scale-[6]">
                        <Legend simplified />
                      </div>
                    </div>
                  )}
                </ClientOnly>
              </div>

              <Timeline poster className="poster-timeline" />

              <footer
                className="relative grid shrink-0 grid-cols-4 gap-x-[150px] gap-y-[90px] bg-[#374151] px-[155px] py-[120px] text-white [&_strong]:text-[#ff7a7a]"
                style={{ height: 3200 }}
              >
                <img
                  src={qrCode}
                  alt="Scan to learn more about Git-Truck@Pluck"
                  className="absolute top-[120px] right-[155px] h-[900px] w-[900px]"
                />
                <section className="col-span-4">
                  <h2 className="montserrat-500 m-0 max-w-[7600px]" style={{ fontSize: 250, lineHeight: 1.15 }}>
                    Git-Truck@Pluck – Contributor-Centric Coordinated Views for Hierarchical Visualization of Git
                    Repository Evolution
                  </h2>
                  <div className="mt-[70px] flex items-center gap-[140px]" style={{ fontSize: 100 }}>
                    <figure className="m-0 flex items-center gap-[60px]">
                      <img
                        src={gustavMugshot}
                        alt="Gustav Müller Christoffersen"
                        className="h-[280px] w-[280px] rounded-full object-cover"
                      />
                      <figcaption>Gustav Müller Christoffersen</figcaption>
                    </figure>
                    <figure className="m-0 flex items-center gap-[60px]">
                      <img
                        src={jonasMugshot}
                        alt="Jonas Nim Røssum"
                        className="h-[280px] w-[280px] rounded-full object-cover"
                      />
                      <figcaption>Jonas Nim Røssum</figcaption>
                    </figure>
                    <figure className="m-0 flex items-center gap-[60px]">
                      <img
                        src={mirceaMugshot}
                        alt="Mircea Lungu"
                        className="h-[280px] w-[280px] rounded-full object-cover"
                      />
                      <figcaption>Mircea Lungu</figcaption>
                    </figure>
                  </div>
                </section>
                <section>
                  <h2 className="montserrat-500 m-0" style={{ fontSize: 200 }}>
                    Problem
                  </h2>
                  <ul className="montserrat-300 m-0 list-disc pl-[180px]" style={{ fontSize: 110 }}>
                    Understanding <strong>who</strong> contributes, <strong>where</strong> they contribute, and{" "}
                    <strong>when</strong> they participate in evolving software projects is <strong>difficult</strong>,
                    and requires disconnected and uncoordinated tools.
                  </ul>
                </section>
                <section>
                  <h2 className="montserrat-500 m-0" style={{ fontSize: 200 }}>
                    Approach
                  </h2>
                  <ul className="montserrat-300 m-0 list-disc pl-[180px]" style={{ fontSize: 110 }}>
                    A new major version of <strong>Git-Truck</strong>, introducing coordinated contributor-centric
                    exploration mechanisms to highlight <strong>developer footprints</strong> across repository{" "}
                    <strong>structure</strong>, project <strong>evolution</strong>, and commit <strong>history</strong>.
                  </ul>
                </section>
                <section>
                  <h2 className="montserrat-500 m-0" style={{ fontSize: 200 }}>
                    Evaluation
                  </h2>
                  <ul className="montserrat-300 m-0 list-disc pl-[180px]" style={{ fontSize: 110 }}>
                    Five professional OSS collaborators explored familiar repositories through Git-Truck@Pluck in{" "}
                    <strong>think-aloud sessions</strong>, allowing for visualizations to challenge existing assumptions
                    about the software project.
                  </ul>
                </section>
                <section>
                  <h2 className="montserrat-500 m-0" style={{ fontSize: 200 }}>
                    Results
                  </h2>
                  <ul className="montserrat-300 m-0 list-disc pl-[180px]" style={{ fontSize: 110 }}>
                    Participants surfaced hidden <strong>contributor specializations</strong>,{" "}
                    <strong>collaboration hotspots</strong>, and temporal shifts in{" "}
                    <strong>contributor prominence</strong>, while also encountering <strong>AI-agents</strong>{" "}
                    appearing as high-churn, first class contributors.
                  </ul>
                </section>
              </footer>
            </div>
          </Providers>
        )}
      </Await>
    </Suspense>
  )
}
