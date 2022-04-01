import { ActionFunction, json, LoaderFunction, useLoaderData } from "remix";
import { Providers } from "~/components/Providers";
import { Box, Container, Grower } from "~/components/util";
import { SidePanel } from "~/components/SidePanel";
import { Main } from "~/components/Main";
import { AnalyzerData } from "~/analyzer/model";
import { analyze, openFile, updateTruckConfig } from "~/analyzer/analyze.server";
import { GlobalInfo } from "~/components/GlobalInfo";
import { Options } from "~/components/Options";
import SearchBar from "~/components/SearchBar";
import { Spacer } from "~/components/Spacer";
import { Legend } from "~/components/Legend";
import { getArgs } from "~/analyzer/args.server";
import { HiddenFiles } from "~/components/HiddenFiles";
import semverCompare from "semver-compare"
import { Details } from "~/components/Details";

let useCacheNextTime = false

export const loader: LoaderFunction = async () => {
  const useCache = useCacheNextTime
  const data = await analyze(useCache)
  useCacheNextTime = false
  return json<AnalyzerData>(data)
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const refresh = formData.get("refresh");
  const unignore = formData.get("unignore")
  const ignore = formData.get("ignore")
  const fileToOpen = formData.get("open")

  if (refresh) {
    useCacheNextTime = true
    return null
  }

  if (ignore && typeof ignore === "string") {
    await updateTruckConfig((await getArgs()).path, prevConfig => {
      const hiddenFilesSet = new Set((prevConfig?.hiddenFiles ?? []).map(x => x.trim()))
      hiddenFilesSet.add(ignore)

      return ({
      ...prevConfig,
      hiddenFiles: Array.from(hiddenFilesSet.values())
    })})
    return null
  }

  if (unignore && typeof unignore === "string") {
    await updateTruckConfig((await getArgs()).path, prevConfig => {
      const hiddenFilesSet = new Set((prevConfig?.hiddenFiles ?? []).map(x => x.trim()))
      hiddenFilesSet.delete(unignore.trim())

      return ({
      ...prevConfig,
      hiddenFiles: Array.from(hiddenFilesSet.values())
    })})
    return null
  }

  if (typeof fileToOpen === "string") {
    openFile(fileToOpen)
    return null
  }

  return null
}

export default function Index() {
  const data = useLoaderData<AnalyzerData>()

  return (
    <Providers
      data={data}
    >
      <Container>
        <SidePanel>
          <GlobalInfo />
          <Options />
          <SearchBar />
          <Spacer />
        </SidePanel>
        {typeof document !== "undefined" ? <Main /> : <div />}
        <SidePanel>
          {data.latestVersion && semverCompare(data.latestVersion, data.currentVersion) === 1 ?
            <Box>
              <p title={`To update, close application and run: npx git-truck@latest`}>Update available: {data.latestVersion}</p>
            </Box>
            : null
          }
          <Grower />
          <Details />
          {data.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <Legend />
        </SidePanel>
      </Container>
    </Providers>
  );
}
