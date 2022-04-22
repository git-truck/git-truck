import { ActionFunction, ErrorBoundaryComponent, json, Link, LoaderFunction, useLoaderData } from "remix"
import { Providers } from "~/components/Providers"
import { Box, Container, Grower, Code, StyledP, LightFontAwesomeIcon, TextButton } from "~/components/util"
import { SidePanel } from "~/components/SidePanel"
import { Main } from "~/components/Main"
import { AnalyzerData, TruckUserConfig } from "~/analyzer/model"
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server"
import { GlobalInfo } from "~/components/GlobalInfo"
import { Options } from "~/components/Options"
import SearchBar from "~/components/SearchBar"
import { Spacer } from "~/components/Spacer"
import { Legend } from "~/components/Legend"
import { getTruckConfigWithArgs } from "~/analyzer/args.server"
import { HiddenFiles } from "~/components/HiddenFiles"
import semverCompare from "semver-compare"
import { Details } from "~/components/Details"
import { resolve } from "path"
import { faTriangleExclamation, faComment } from "@fortawesome/free-solid-svg-icons"

let invalidateCache = false

export const loader: LoaderFunction = async ({ params }) => {
  const args = await getTruckConfigWithArgs(params["repo"] as string)

  const options: TruckUserConfig = {
    invalidateCache: invalidateCache || args.invalidateCache,
  }
  if (params["repo"]) {
    options.path = resolve(args.path, params["repo"])
  }

  if (params["*"]) {
    options.branch = params["*"]
  }

  const data = await analyze({ ...args, ...options })
  invalidateCache = false
  return json<AnalyzerData>(data)
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

  if (refresh) {
    invalidateCache = true
    return null
  }

  const args = await getTruckConfigWithArgs(params["repo"])
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
      <p>
        <LightFontAwesomeIcon icon={faComment} /> Help make Git Truck better
      </p>
      <Spacer xs />
      <TextButton
        onClick={() =>
          openInNewTab(
            "https://docs.google.com/forms/d/e/1FAIpQLSclLnUCPb0wLZx5RulQLaI_N_4wjNkd6z7YLkA3BzNVFjfiEg/viewform?usp=sf_link"
          )
        }
      >
        Answer questionnaire
      </TextButton>
      <Spacer xs />
      <TextButton
        onClick={() => openInNewTab("https://github.com/git-truck/git-truck/issues/new?template=user-issue.md")}
      >
        Open an issue
      </TextButton>
    </Box>
  )
}

export default function Index() {
  const data = useLoaderData<AnalyzerData>()

  if (!data) return null

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
          {data.latestVersion && semverCompare(data.latestVersion, data.currentVersion) === 1 ? (
            <Box>
              <p>Update available: {data.latestVersion}</p>
              <StyledP>Currently installed: {data.currentVersion}</StyledP>
              <StyledP>
                To update, close application and run: <Code inline>npx git-truck@latest</Code>
              </StyledP>
            </Box>
          ) : null}
          {data.hasUnstagedChanges ? (
            <Box>
              <p>
                <LightFontAwesomeIcon icon={faTriangleExclamation} />
                You have unstaged changes
              </p>
              <StyledP>
                This means that some data might be incorrect. Please stash or commit changes and rerun analyzer.
              </StyledP>
            </Box>
          ) : null}
          <Grower />
          <Details />
          {data.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <Legend />
        </SidePanel>
      </Container>
    </Providers>
  )
}
