import { mdiMenu, mdiRestore } from "@mdi/js"
import { Icon } from "~/components/Icon"
import {
  Await,
  useLoaderData,
  Link,
  Outlet,
  redirect,
  createContext,
  Form,
  useLocation,
  href,
  useNavigate
} from "react-router"
import clsx from "clsx"
import randomstring from "randomstring"
import { Activity, Suspense, useReducer, useState } from "react"
import { createPortal } from "react-dom"
import { GitCaller } from "~/analyzer/git-caller.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { DatabaseInfo, GitObject, RepoData } from "~/shared/model"
import { shouldUpdate } from "~/shared/RefreshPolicy"
import { getArgsWithDefaults, getRepoNameFromPath, normalizeAndResolvePath, openFile } from "~/shared/util.server"
import { Breadcrumb } from "~/components/Breadcrumb"
import { Chart } from "~/components/Chart"
import { HideFilesButton } from "~/components/buttons/HideFilesButton"
import { Legend } from "~/components/legend/Legend"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import { SearchCard } from "~/components/SearchCard"
import Timeline from "~/components/TimeSlider"
import { cn } from "~/styling"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/view"
import { RefreshButton } from "~/components/buttons/RefreshButton"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { ChartTooltip } from "~/components/ChartTooltip"
import { ClientOnly } from "~/components/util"
import { FullscreenButton } from "~/components/buttons/FullscreenButton"
import { getPathFromRepoAndHead, invariant } from "~/shared/util"
import type ServerInstance from "~/analyzer/ServerInstance.server"
import { versionContext } from "~/root"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { createLoader, createSerializer, parseAsString } from "nuqs/server"
import { RevisionSelect } from "~/components/RevisionSelect"
import { SettingsButton } from "~/components/buttons/SettingsButton"
import { useQueryState, type inferParserType } from "nuqs"
import { BrowseParentFolder } from "~/components/BrowseParentFolder"
import { ModalManager } from "~/components/modals/ModalManager"
import { GroupAuthorsButton } from "~/components/buttons/GroupAuthorsButton"

export const currentRepositoryContext = createContext<{
  instance: ServerInstance
  repositoryPath: string
  repositoryName: string
  branch: string
  checkedOutBranch: string
}>()

export const viewSearchParamsConfig = {
  path: parseAsString,
  objectPath: parseAsString,
  zoomPath: parseAsString,
  branch: parseAsString
}

export const viewSerializer = createSerializer(viewSearchParamsConfig)
export const loadViewSearchParams = createLoader(viewSearchParamsConfig)

type ViewSearchParams = inferParserType<typeof viewSearchParamsConfig>

const viewMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const viewSearchParams = loadViewSearchParams(request)

  const { path, branch } = viewSearchParams

  if (!path) {
    log.warn(`No path provided in url ${request.url}, using default path from args`)
  }

  const repositoryPath = normalizeAndResolvePath(path ?? getArgsWithDefaults().path)

  const checkedOutBranch = await GitCaller._getRepositoryHead(repositoryPath)

  const instance = InstanceManager.getOrCreateInstance({ repositoryPath, branch: branch ?? checkedOutBranch })
  invariant(instance, `Instance for repo at path ${repositoryPath} and branch ${branch ?? checkedOutBranch} not found`)

  context.set(currentRepositoryContext, {
    instance,
    repositoryPath,
    repositoryName: getRepoNameFromPath(repositoryPath),
    branch: branch ?? checkedOutBranch,
    checkedOutBranch
  })
}

export const middleware: Route.MiddlewareFunction[] = [viewMiddleware]

export const meta = ({ loaderData }: Route.MetaArgs) => [
  {
    title: `${loaderData.repositoryName} - Git Truck`
  }
]

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const { instance, repositoryName, repositoryPath, branch: defaultBranch } = context.get(currentRepositoryContext)
  const versionInfo = context.get(versionContext)

  const viewSearchParams = loadViewSearchParams(request)

  const { path, zoomPath, branch } = viewSearchParams

  // Redirect to browse if not a git repo
  if (!(await GitCaller.isValidGitRepo(repositoryPath))) {
    const url = href("/browse") + viewSerializer({ path: repositoryPath })
    log.warn(`Path ${repositoryPath} is not a git repository, redirecting to ${url}`)
    throw redirect(url)
  }

  let shouldRedirect = false
  const params = (
    [
      ["path", { param: path, fallback: repositoryPath }],
      ["branch", { param: branch, fallback: defaultBranch }],
      // ["objectPath", { param: objectPath, fallback: instance.repositoryName }],
      ["zoomPath", { param: zoomPath, fallback: getRepoNameFromPath(repositoryPath) }]
    ] as const
  ).reduce<ViewSearchParams>((params, [paramName, { param, fallback }]) => {
    if (!param) {
      shouldRedirect = true
      return { ...params, [paramName]: fallback }
    }
    return params
  }, viewSearchParams)

  if (shouldRedirect) {
    const redirectUrl = href("/view") + viewSerializer(params)
    log.warn(`At least one required parameter is missing, redirecting to ${redirectUrl}`)
    throw redirect(redirectUrl)
  }

  return {
    dataPromise: analyze({ instance, path: repositoryPath, branch: branch! }),
    repositoryName,
    versionInfo
  }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const { instance, repositoryPath } = context.get(currentRepositoryContext)

  const formData = await request.formData()
  const refresh = formData.get("refresh")
  const unionedAuthors = formData.get("unionedAuthors")
  const rerollColors = formData.get("rerollColors")
  const timeseries = formData.get("timeseries")
  const authorname = formData.get("authorname")
  const authorcolor = formData.get("authorcolor")
  const ignorePath = formData.get("hide") as string | null
  const unignorePath = formData.get("show") as string | null
  const openPath = formData.get("open") as string | null

  instance.prevInvokeReason = "unknown"
  if (refresh) {
    instance.prevInvokeReason = "refresh"
    return null
  }

  if (ignorePath && typeof ignorePath === "string") {
    log.info("Ignoring path: " + ignorePath)
    instance.prevInvokeReason = "hide"
    const hidden = await instance.db.getHiddenFiles()
    hidden.push(ignorePath)
    await instance.db.replaceHiddenFiles(hidden)

    return null
  }

  if (unignorePath && typeof unignorePath === "string") {
    instance.prevInvokeReason = "show"
    const hidden = await instance.db.getHiddenFiles()
    await instance.db.replaceHiddenFiles(hidden.filter((path) => path !== unignorePath))
    return null
  }

  if (typeof openPath === "string") {
    instance.prevInvokeReason = "open"
    openFile(repositoryPath, openPath)
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

async function analyze({ instance, path, branch }: { instance: ServerInstance; path: string; branch: string }) {
  const repo = path.split("/").pop()!
  const isRepo = await GitCaller.isValidGitRepo(path)
  if (!isRepo) throw new Error(`No repo found at ${path}`)
  const isValidRevision = await GitCaller.isValidRevision(branch, path)
  if (!isValidRevision) {
    throw new Error(
      `Invalid revision of repo ${repo}: ${branch}\nIf ${branch} is a remote branch, make sure it is pulled locally`
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
      : await InstanceManager.getOrCreateMetadataDB().getLastRun({
          repositoryPath: instance.repositoryPath,
          branch: instance.branch
        })
  const colorSeed = prevRes && !shouldUpdate(reason, "colorSeed") ? prevRes.colorSeed : await instance.db.getColorSeed()
  const authorColors =
    prevRes && !shouldUpdate(reason, "authorColors")
      ? prevRes.authorColors
      : await InstanceManager.getOrCreateMetadataDB().getAuthorColors()
  const [commitCountPerTimeInterval, commitCountPerTimeIntervalUnit] =
    prevRes && !shouldUpdate(reason, "commitCountPerDay")
      ? ([prevRes.commitCountPerTimeInterval, prevRes.commitCountPerTimeIntervalUnit] as const)
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
    lastRunInfo: lastRunInfo ?? { time: 0, hash: "" },
    repo: instance.repositoryName,
    branch,
    timerange,
    colorSeed,
    selectedRange,
    authorColors,
    commitCountPerTimeInterval,
    commitCountPerTimeIntervalUnit,
    analyzedRepos,
    contribSumPerFile: contribCounts,
    maxMinContribCounts,
    commitCount
  }

  const fullData: RepoData = { repo: repositoryMetadata, databaseInfo: databaseInfo }
  return fullData
}

export default function Repo() {
  const { versionInfo, dataPromise } = useLoaderData<typeof loader>()

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

  const [hoveredObject, setHoveredObject] = useState<GitObject | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [objectPath] = useQueryState("objectPath", viewSearchParamsConfig.objectPath)

  const clearCacheUrl = `/clear-cache?${new URLSearchParams({
    redirect: location.pathname + location.search
  }).toString()}`

  const objectPathIsFile = objectPath?.split("/").pop()?.includes(".")
  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
          <LoadingIndicator
            showProgress
            loadingText={
              <div className="flex flex-col items-center gap-2">
                Stuck? Try clearing the cache:
                <Link to={clearCacheUrl} className="btn btn--primary">
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
                `grid grid-cols-1 transition-all [grid-template-areas:"main"_"left"] lg:h-screen lg:grid-cols-[0_1fr] lg:grid-rows-[1fr] lg:overflow-hidden lg:[grid-template-areas:"left_main"]`,
                {
                  "gap-2 lg:grid-cols-[var(--spacing-sidepanel)_1fr]": leftExpanded
                }
              )}
            >
              <Activity mode={leftExpanded ? "visible" : "hidden"}>
                <aside
                  className={clsx(
                    "*:not-first:m-2 lg:pr-0 lg:transition-transform",
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
                    title={
                      <>
                        {objectPath ? (
                          <>
                            <span className="truncate" title={objectPath}>
                              Details:{" "}
                              <span className="normal-case">
                                {objectPathIsFile ? objectPath.split("/").pop() : objectPath}
                              </span>
                            </span>
                          </>
                        ) : (
                          "Details"
                        )}
                      </>
                    }
                    contentClassName="pb-6"
                  >
                    <Outlet />
                  </CollapsibleHeader>
                  <CollapsibleHeader
                    className="card"
                    title={<>Visualization options</>}
                    contentClassName="pb-6 flex flex-col gap-2"
                  >
                    <Options />
                  </CollapsibleHeader>
                  <CollapsibleHeader className="card" title="Legend" contentClassName="pb-6">
                    <Legend hoveredObject={hoveredObject} />
                  </CollapsibleHeader>
                </aside>
              </Activity>
              <main
                className={cn(
                  "relative grid h-full min-h-screen min-w-25 grid-rows-[auto_1fr_auto] gap-2 [grid-area:main] lg:transition-transform"
                )}
              >
                <header className="from-primary-bg dark:from-primary-bg-dark to-primary-bg dark:to-primary-bg-dark top-0 right-0 left-0 z-10 grid grid-flow-col items-center justify-between gap-2 bg-linear-to-r via-transparent p-2">
                  <div className="flex gap-2">
                    {!leftExpanded ? (
                      <button title="Show left panel" className="btn btn--text aspect-square" onClick={toggleLeft}>
                        <Icon path={mdiMenu} size={1} />
                      </button>
                    ) : (
                      <div />
                    )}
                    {/* <AnalysisInfo /> */}
                    <BrowseParentFolder />
                    <Breadcrumb zoom />
                  </div>
                  <div className="flex gap-2"></div>
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
                          (rep) => rep.repo === data.databaseInfo.repo
                        )}
                        onChange={(e) =>
                          navigate(getPathFromRepoAndHead({ path: data.repo.repositoryPath, branch: e.target.value }))
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
                          <Await resolve={dataPromise}>
                            {() => <Chart hoveredObject={hoveredObject} setHoveredObject={setHoveredObject} />}
                          </Await>
                        </Suspense>
                        {createPortal(<ChartTooltip hoveredObject={hoveredObject} />, document.body)}
                      </>
                    )}
                  </ClientOnly>
                </div>
                <div className="flex flex-col gap-1 px-2 text-center select-none">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="card__title">Commits per {data.databaseInfo.commitCountPerTimeIntervalUnit}</h2>
                    {/* TODO: Add presets, like "Last 24 hours, last 7 days, last 30 days, last years etc." */}
                    <Form
                      className={cn({
                        invisible:
                          data.databaseInfo.timerange[0] === data.databaseInfo.selectedRange[0] &&
                          data.databaseInfo.timerange[1] === data.databaseInfo.selectedRange[1]
                      })}
                      method="post"
                    >
                      <input
                        type="hidden"
                        name="timeseries"
                        value={`${data.databaseInfo.timerange[0]}-${data.databaseInfo.timerange[1]}`}
                      />
                      <button className={cn("btn btn--text", {})}>
                        <Icon path={mdiRestore} />
                        Reset time interval
                      </button>
                    </Form>
                  </div>
                  <Timeline key={`${data.databaseInfo.selectedRange[0]}-${data.databaseInfo.selectedRange[1]}`} />
                </div>
              </main>
            </div>
            <ModalManager />
          </Providers>
        )}
      </Await>
    </Suspense>
  )
}
