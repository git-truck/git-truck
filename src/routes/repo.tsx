import { ActionFunction, json, LoaderFunction, Outlet, useLoaderData } from "remix";
import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { Providers } from "~/components/Providers";
import { Container } from "~/components/util";
import { SidePanel } from "~/components/SidePanel";
import { Main } from "~/components/Main";
import { ParserData } from "~/parser/model";
import { parse, updateTruckConfig } from "~/parser/parse.server";
import { GlobalInfo } from "~/components/GlobalInfo";
import { Options } from "~/components/Options";
import SearchBar from "~/components/SearchBar";
import { Spacer } from "~/components/Spacer";
import { Legend } from "~/components/Legend";
import { IgnoredFiles } from "~/components/IgnoredFiles";
import { getArgs } from "~/parser/args.server";

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
  const data = await parse(useCache)
  useCacheNextTime = false
  return json<ParserData>(data)
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
      const ignoredFilesSet = new Set((prevConfig?.ignoredFiles ?? []).map(x => x.trim()))
      ignoredFilesSet.add(ignore)

      return ({
      ...prevConfig,
      ignoredFiles: Array.from(ignoredFilesSet.values())
    })})
    return null
  }

  if (unignore && typeof unignore === "string") {
    await updateTruckConfig((await getArgs()).path, prevConfig => {
      const ignoredFilesSet = new Set((prevConfig?.ignoredFiles ?? []).map(x => x.trim()))
      ignoredFilesSet.delete(unignore.trim())

      return ({
      ...prevConfig,
      ignoredFiles: Array.from(ignoredFilesSet.values())
    })})
    return null
  }

  return null
}


export default function Index() {
  const data = useLoaderData<ParserData>()

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
          <Outlet />
          {data.ignoredFiles.length > 0 ? <IgnoredFiles /> : null}
          <Legend />
        </SidePanel>
        {typeof document !== "undefined" ? <Main /> : null}
      </Container>
    </Providers>
  );
}
