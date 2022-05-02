import {
  RateReview as ReviewIcon
} from "@styled-icons/material"
import { resolve } from "path"
import { ActionFunction, ErrorBoundaryComponent, json, Link, LoaderFunction, redirect, useLoaderData } from "remix"
import semverCompare from "semver-compare"
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server"
import { getTruckConfigWithArgs } from "~/analyzer/args.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import { AnalyzerData, Repository, TruckUserConfig } from "~/analyzer/model"
import { getGitTruckInfo } from "~/analyzer/util.server"
import { Details } from "~/components/Details"
import { GlobalInfo } from "~/components/GlobalInfo"
import { HiddenFiles } from "~/components/HiddenFiles"
import { Legend } from "~/components/Legend"
import { Main } from "~/components/Main"
import { Options } from "~/components/Options"
import { Providers } from "~/components/Providers"
import SearchBar from "~/components/SearchBar"
import { SidePanel } from "~/components/SidePanel"
import { Spacer } from "~/components/Spacer"
import { Box, BoxP, BoxSubTitle, BoxSubTitleAndIconWrapper, Code, Container, Grower, Button } from "~/components/util"
import { useData } from "~/contexts/DataContext"

import { useBoolean } from "react-use"
import { addAuthorUnion, makeDupeMap } from "~/authorUnionUtil.server"
import { UnionAuthorsModal } from "~/components/UnionAuthorsModal"

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

export const loader: LoaderFunction = async ({ params }) => {
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

  const analyzerData = await analyze({ ...args, ...options })
    .then((data) => addAuthorUnion(data, makeDupeMap(truckConfig.unionedAuthors ?? [])))


  invalidateCache = false
  const repo = await GitCaller.getRepoMetadata(options.path)

  if (!repo) {
    throw Error("Error loading repo")
  }

  return json<RepoData>({
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
    <Container>
      <div />
      <Box>
        <h1>An error occured!</h1>
        <p>See console for more infomation.</p>
        <Code>{error.stack}</Code>
        <div>
          <Link to=".">Retry</Link>
        </div>
        <div>
          <Link to="..">Go back</Link>
        </div>
      </Box>
    </Container>
  )
}

function openInNewTab(url: string) {
  window.open(url, "_blank")
}

function Feedback() {
  return (
    <Box>
      <BoxSubTitleAndIconWrapper>
        <ReviewIcon display="inline-block" height="1rem" />
        <BoxSubTitle>Help make Git Truck better</BoxSubTitle>
      </BoxSubTitleAndIconWrapper>
      <Spacer xl />
      <Button
        onClick={() =>
          openInNewTab(
            "https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link"
          )
        }
      >
        Answer questionnaire
      </Button>
      <Spacer />
      <Button
        onClick={() => openInNewTab("https://github.com/git-truck/git-truck/issues/new?template=user-issue.md")}
      >
        Open an issue
      </Button>
    </Box>
  )
}

function UpdateNotifier() {
  const { gitTruckInfo } = useData()
  return (
    <Box>
      <p>Update available: {gitTruckInfo.latestVersion}</p>
      <BoxP>Currently installed: {gitTruckInfo.version}</BoxP>
      <BoxP>
        To update, close application and run: <Code inline>npx git-truck@latest</Code>
      </BoxP>
    </Box>
  )
}

export default function Repo() {
  const data = useLoaderData<RepoData>()
  const { analyzerData, gitTruckInfo } = data

  const [unionAuthorsModalOpen, setUnionAuthorsModalOpen] = useBoolean(false)
  const showUnionAuthorsModal = () => setUnionAuthorsModalOpen(true)

  if (!analyzerData) return null

  return (
    <Providers data={data}>
      <Container>
        <SidePanel>
          <GlobalInfo />
          <Feedback />
          <Options />
          <SearchBar />
          <Spacer />
        </SidePanel>
        {typeof document !== "undefined" ? <Main /> : <div />}
        <SidePanel>
          {gitTruckInfo.latestVersion && semverCompare(gitTruckInfo.latestVersion, gitTruckInfo.version) === 1 ? (
            <UpdateNotifier />
          ) : null}
          <Grower />
          <Details showUnionAuthorsModal={showUnionAuthorsModal} />
          {analyzerData.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <Legend showUnionAuthorsModal={showUnionAuthorsModal} />
        </SidePanel>
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
