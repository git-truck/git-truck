import { mdiMenu } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Await, useLoaderData, Link, Outlet, useOutletContext, redirect, createContext } from "react-router"
import clsx from "clsx"
import { resolve } from "path"
import randomstring from "randomstring"
import { Activity, Suspense, useReducer, useState } from "react"
import { createPortal } from "react-dom"
import { GitCaller } from "~/analyzer/git-caller.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { DatabaseInfo, GitObject, RepoData } from "~/shared/model"
import { shouldUpdate } from "~/shared/RefreshPolicy"
import { getArgs, getRepoNameFromPath, openFile } from "~/shared/util.server"
import { Breadcrumb } from "~/components/Breadcrumb"
import { Chart } from "~/components/Chart"
import { GlobalInfo } from "~/components/GlobalInfo"
import { HiddenFiles } from "~/components/HiddenFiles"
import { Legend } from "~/components/legend/Legend"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import { SearchCard } from "~/components/SearchCard"
import TimeSlider from "~/components/TimeSlider"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"

import { cn } from "~/styling"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/view"
import { RefreshButton } from "~/components/RefreshButton"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import BarChart from "~/components/BarChart"
import { ChartTooltip } from "~/components/ChartTooltip"
import { ClientOnly, FullscreenButton } from "~/components/util"
import { getPathFromRepoAndHead, invariant } from "~/shared/util"
import type ServerInstance from "~/analyzer/ServerInstance.server"
import { versionContext } from "~/root"

export const useRepoContext = () =>
  useOutletContext<{
    showUnionAuthorsModal: () => void
  }>()

export const currentRepositoryContext = createContext<{
  instance: ServerInstance
  repositoryPath: string
  repositoryName: string
  branch: string
  checkedOutBranch: string
}>()

const viewMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  const searchParams = new URL(request.url).searchParams
  const args = await getArgs()
  const repositoryPath = resolve(searchParams.get("path") ?? args.path)

  // Redirect to browse if not a git repo
  if (!(await GitCaller.isGitRepo(repositoryPath))) {
    throw redirect(getPathFromRepoAndHead({ path: repositoryPath }, ["browse"]))
  }

  const checkedOutBranch = await GitCaller._getRepositoryHead(repositoryPath)
  const branch = searchParams.get("branch") ?? checkedOutBranch

  const instance = InstanceManager.getOrCreateInstance({ repositoryPath, branch })

  invariant(instance, `Instance for repo at path ${repositoryPath} and branch ${branch} not found`)

  context.set(currentRepositoryContext, {
    instance,
    repositoryPath,
    repositoryName: getRepoNameFromPath(repositoryPath),
    branch,
    checkedOutBranch
  })
}

export const middleware: Route.MiddlewareFunction[] = [viewMiddleware]

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const { instance, repositoryPath, branch, checkedOutBranch } = context.get(currentRepositoryContext)
  const urlSearchParams = new URL(request.url).searchParams

  // Clean up URL if branch is the same as the current head
  if (urlSearchParams.get("branch") && checkedOutBranch === branch) {
    throw redirect(getPathFromRepoAndHead({ path: repositoryPath }, ["view"]))
  }

  const versionInfo = context.get(versionContext)

  return {
    dataPromise: analyze({ instance, path: repositoryPath, branch }),
    versionInfo
  }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const { instance } = context.get(currentRepositoryContext)
  const args = await getArgs()

  const searchParams = new URL(request.url).searchParams
  const repositoryPath = resolve(searchParams.get("path") ?? args.path)
  let branch = searchParams.get("branch")

  if (!branch) {
    branch = await GitCaller._getRepositoryHead(repositoryPath)
  }

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
    openFile(instance.repositoryPath, fileToOpen)
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
  const isRepo = await GitCaller.isGitRepo(path)
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
    lastRunInfo: lastRunInfo ?? ({} as { time: number; hash: string }),
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

  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useState(false)
  const [hoveredObject, setHoveredObject] = useState<GitObject | null>(null)
  const showUnionAuthorsModal = (): void => setUnionAuthorsModalOpen(true)

  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center">
          <LoadingIndicator
            showProgress
            loadingText={
              <div className="flex flex-col items-center gap-2">
                Stuck? Try clearing the cache:
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
                `grid grid-cols-1 gap-2 p-2 transition-all [grid-template-areas:"main"_"left"] lg:h-screen lg:grid-cols-[0_1fr] lg:grid-rows-[1fr] lg:overflow-hidden lg:[grid-template-areas:"left_main"]`,
                {
                  "lg:grid-cols-[var(--spacing-sidepanel)_1fr_0]": leftExpanded
                }
              )}
            >
              <Activity mode={leftExpanded ? "visible" : "hidden"}>
                <aside
                  className={clsx(
                    "flex flex-col items-stretch justify-start gap-2 [grid-area:left] lg:pr-0 lg:transition-transform",
                    leftExpanded ? "overflow-y-auto" : "lg:-translate-x-sidepanel"
                  )}
                >
                  <GlobalInfo className={leftExpanded ? "" : "hidden"} onMenuClick={toggleLeft} />
                  <div
                    className={cn("card relative", {
                      // hidden: !leftExpanded
                    })}
                  >
                    <Options />
                    <Legend
                      className="justify-self-end"
                      hoveredObject={hoveredObject}
                      showUnionAuthorsModal={showUnionAuthorsModal}
                    />
                  </div>
                  <Outlet context={{ showUnionAuthorsModal }} />

                  <div className={cn("grow", {})} />
                  <GitTruckInfo
                    className={cn("sticky bottom-0", {
                      // hidden: !leftExpanded
                    })}
                    installedVersion={versionInfo.installedVersion}
                    latestVersion={versionInfo.latestVersion}
                  />
                </aside>
              </Activity>
              <main
                className={cn(
                  "relative grid h-full min-w-[100px] grid-rows-[auto_1fr] gap-2 overflow-y-hidden [grid-area:main] lg:transition-transform"
                )}
              >
                <header className="grid grid-flow-col items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {!leftExpanded ? (
                      <button title={"Show left panel"} onClick={toggleLeft} className="btn btn--text aspect-square">
                        <Icon path={mdiMenu} size={1} />
                      </button>
                    ) : (
                      <div />
                    )}
                    <Breadcrumb />
                  </div>
                  <div className="flex gap-2">
                    <SearchCard />
                    <RefreshButton />
                    <HiddenFiles />
                    <FullscreenButton />
                  </div>
                </header>

                <>
                  <div className="grid overflow-hidden">
                    <Suspense
                      fallback={
                        <div className="grid h-screen place-items-center">
                          <LoadingIndicator showProgress />
                        </div>
                      }
                    >
                      <Await resolve={dataPromise}>{() => <Chart setHoveredObject={setHoveredObject} />}</Await>
                    </Suspense>
                    <ClientOnly>
                      {() => createPortal(<ChartTooltip hoveredObject={hoveredObject} />, document.body)}
                    </ClientOnly>
                  </div>

                  <div className="card flex flex-col gap-1 px-2 text-center select-none">
                    <h2 className="card__title">Commits per {data.databaseInfo.commitCountPerTimeIntervalUnit}</h2>
                    <BarChart />
                    <TimeSlider />
                  </div>
                </>
              </main>
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
