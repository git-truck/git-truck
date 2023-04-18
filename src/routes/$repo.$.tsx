import { RateReview as ReviewIcon } from "@styled-icons/material"
import { resolve } from "path"
import { useState } from "react"
import { useBoolean } from "react-use"
import type { ActionFunction, ErrorBoundaryComponent, LoaderArgs } from "@remix-run/node"
import { redirect } from "@remix-run/node"
import { typedjson, useTypedLoaderData } from "remix-typedjson"
import { Link } from "@remix-run/react"
import styled from "styled-components"
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server"
import { getTruckConfigWithArgs } from "~/analyzer/args.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import type { AnalyzerData, Repository, TruckUserConfig } from "~/analyzer/model"
import { getGitTruckInfo } from "~/analyzer/util.server"
import { addAuthorUnion, makeDupeMap } from "~/authorUnionUtil.server"
import { Details } from "~/components/Details"
import { GlobalInfo } from "~/components/GlobalInfo"
import { HiddenFiles } from "~/components/HiddenFiles"
import { Legend } from "~/components/legend/Legend"
import { Main } from "~/components/Main"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import SearchBar from "~/components/SearchBar"
import { Spacer } from "~/components/Spacer"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"
import { Code } from "~/components/util"
import { useData } from "~/contexts/DataContext"
import { semverCompare } from "~/util"

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
    <Container isFullscreen={false}>
      <div />
      <div className="box">
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
    </Container>
  )
}

function openInNewTab(url: string) {
  window.open(url, "_blank")
}

function Feedback() {
  return (
    <div className="box">
      <div className="grid grid-flow-col items-center justify-start gap-1">
        <ReviewIcon display="inline-block" height="1rem" />
        <h3 className="box__subtitle">Help improve Git Truck</h3>
      </div>
      <Spacer xl />
      <button
        className="btn"
        onClick={() =>
          openInNewTab(
            "https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link"
          )
        }
      >
        Answer questionnaire
      </button>
      <Spacer />
      <button
        className="btn"
        onClick={() => openInNewTab("https://github.com/git-truck/git-truck/issues/new?template=user-issue.md")}
      >
        Open an issue
      </button>
    </div>
  )
}

function UpdateNotifier() {
  const { gitTruckInfo } = useData()
  return (
    <div className="box">
      <p>Update available: {gitTruckInfo.latestVersion}</p>
      <p className="box-p">Currently installed: {gitTruckInfo.version}</p>
      <p className="box-p">
        To update, close application and run: <Code inline>npx git-truck@latest</Code>
      </p>
    </div>
  )
}

export default function Repo() {
  const data = useTypedLoaderData<RepoData>()
  const { analyzerData, gitTruckInfo } = data

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useBoolean(false)
  const showUnionAuthorsModal = () => setUnionAuthorsModalOpen(true)

  if (!analyzerData) return null

  return (
    <Providers data={data}>
      <Container isFullscreen={isFullscreen}>
        <aside className="side-panel">
          <GlobalInfo />
          <Feedback />
          <Options />
          <SearchBar />
          <Spacer />
        </aside>
        {typeof document !== "undefined" ? <Main fullscreenState={[isFullscreen, setIsFullscreen]} /> : <div />}
        <aside className="side-panel">
          {gitTruckInfo.latestVersion && semverCompare(gitTruckInfo.latestVersion, gitTruckInfo.version) === 1 ? (
            <UpdateNotifier />
          ) : null}
          {analyzerData.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <Details showUnionAuthorsModal={showUnionAuthorsModal} />
          <Legend showUnionAuthorsModal={showUnionAuthorsModal} />
        </aside>
      </Container>
      <UnionAuthorsModal
        visible={unionAuthorsModalOpen}
        onClose={() => {
          setUnionAuthorsModalOpen(false)
        }}
      />
    </Providers>
  )
}

const Container = styled.div<{ isFullscreen: boolean }>`
  height: 100vh;
  display: grid;
  transition: 0.5s;
  grid-template-areas: "left main right";
  grid-template-columns: ${(props) =>
    props.isFullscreen ? "0px 1fr 0px" : "var(--side-panel-width) 1fr var(--side-panel-width)"};
  grid-template-rows: 1fr;

  & > main {
    grid-area: main;
  }

  & > aside:first-of-type() {
    grid-area: left;
  }

  & > aside:last-of-type() {
    grid-area: right;
  }

  @media (max-width: 660px) {
    height: auto;
    grid-template-areas:
      "main"
      "left"
      "right";
    grid-template-columns: none;
    grid-template-rows: ${(props) => (props.isFullscreen ? "100vh auto auto" : "50vh auto auto")};
  }
`
