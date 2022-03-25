import { ActionFunction, json, LoaderFunction, Outlet, useLoaderData } from "remix";
import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { Providers } from "~/components/Providers";
import { Box, Container, Grower } from "~/components/util";
import { SidePanel } from "~/components/SidePanel";
import { Main } from "~/components/Main";
import { AnalyzerData } from "~/analyzer/model";
import { analyze, updateTruckConfig } from "~/analyzer/analyze.server";
import { GlobalInfo } from "~/components/GlobalInfo";
import { Options } from "~/components/Options";
import SearchBar from "~/components/SearchBar";
import { Spacer } from "~/components/Spacer";
import { Legend } from "~/components/Legend";
import { getArgs } from "~/analyzer/args.server";
import { HiddenFiles } from "~/components/HiddenFiles";

export function links() {
  return [appStyles,
    varsStyles,
    indexStyles,
    chartStyles].map(x => (
      {
        rel: "stylesheet",
        href: x
      }))
}

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
          {data.currentVersion !== data.latestVersion ?
            <Box>
              <p title={`To update, close application and run: npx git-truck@latest`}>Update available: {data.latestVersion}</p> 
            </Box>
            : null
          }
          <Grower />
          <Outlet />
          {data.hiddenFiles.length > 0 ? <HiddenFiles /> : null}
          <Legend />
        </SidePanel>
      </Container>
    </Providers>
  );
}
