import { resolve } from "path"
import { useState } from "react"
import { useBoolean } from "react-use"
import type { ActionFunction, ErrorBoundaryComponent, LoaderArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { typedjson, useTypedLoaderData } from "remix-typedjson"
import { Link } from "@remix-run/react"
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server"
import { getTruckConfigWithArgs } from "~/analyzer/args.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import type { AnalyzerData, Repository, TruckUserConfig } from "~/analyzer/model"
import { getGitTruckInfo } from "~/analyzer/util.server"
import { addAuthorUnion, makeDupeMap } from "~/authorUnionUtil.server"
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
import { mdiFullscreen, mdiFullscreenExit } from "@mdi/js"
import { Breadcrumb } from "~/components/Breadcrumb"
import { FeedbackCard } from "~/components/FeedbackCard"
import { Chart } from "~/components/Chart"
import { Icon } from "@mdi/react"
import { useClient } from "~/hooks"
import clsx from "clsx"

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

export const loader = async ({ params }: LoaderArgs) => {
  if (!params["repo"] || !params["*"]) {
    return redirect("/")
  }

  const [args, truckConfig] = await getTruckConfigWithArgs(params["repo"] as string)
  const options: TruckUserConfig = {
    invalidateCache: invalidateCache || args.invalidateCache,
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
  const repo = await GitCaller.getRepoMetadata(options.path)

  if (!repo) {
    throw Error("Error loading repo")
  }

  return typedjson<RepoData>({
    analyzerData,
    repo,
    gitTruckInfo: await getGitTruckInfo(),
    truckConfig,
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
        hiddenFiles: Array.from(hiddenFilesSet.values()),
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
        hiddenFiles: Array.from(hiddenFilesSet.values()),
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
          unionedAuthors: json,
        }
      })
    } catch (e) {
      console.error(e)
    }
  }
  return null
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  console.error(error.message)
  console.error(error.stack)
  return (
    <div className="app-container">
      <div />
      <div className="card">
        <h1>An error occured!</h1>
        <p>See console for more infomation.</p>
        <Code>{error.stack}</Code>
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

function UpdateNotifier() {
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
}

export default function Repo() {
  const client = useClient()
  const data = useTypedLoaderData<RepoData>()
  const { analyzerData, gitTruckInfo } = data

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useBoolean(false)
  const showUnionAuthorsModal = (): void => setUnionAuthorsModalOpen(true)

  if (!analyzerData) return null

  return (
    <Providers data={data}>
      <div className={`app-container ${isFullscreen ? "fullscreen" : ""}`}>
        <aside className="flex flex-col gap-2 overflow-y-auto p-2 pr-0">
          <GlobalInfo />
          <Options />
          <SearchCard />
        </aside>

        <main className="grid h-full min-w-[100px] grid-rows-[auto,1fr] gap-2 overflow-hidden p-2">
          <header className="grid grid-flow-col items-center justify-between gap-2">
            <Breadcrumb />
            <button
              className="card btn--icon p-1"
              onClick={() => setIsFullscreen((isFullscreen) => !isFullscreen)}
              title="Toggle full view"
            >
              <Icon path={isFullscreen ? mdiFullscreenExit : mdiFullscreen} size={1} />
            </button>
          </header>
          <div className="card grid overflow-hidden p-2">{client ? <Chart /> : <div />}</div>
        </main>

        <aside
          className={clsx("flex flex-col gap-2 p-2 pl-0", {
            "overflow-y-auto": !isFullscreen,
          })}
        >
          {gitTruckInfo.latestVersion && semverCompare(gitTruckInfo.latestVersion, gitTruckInfo.version) === 1 ? (
            <UpdateNotifier />
          ) : null}
          <Legend showUnionAuthorsModal={showUnionAuthorsModal} />
          {analyzerData.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <DetailsCard
            className={clsx({
              "absolute bottom-0 right-0 max-h-screen -translate-x-full overflow-y-auto shadow shadow-black/50":
                isFullscreen,
            })}
            showUnionAuthorsModal={showUnionAuthorsModal}
          />
          <FeedbackCard />
        </aside>
      </div>
      <UnionAuthorsModal
        visible={unionAuthorsModalOpen}
        onClose={() => {
          setUnionAuthorsModalOpen(false)
        }}
      />
    </Providers>
  )
}
