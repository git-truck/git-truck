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
import { parse } from "~/parser/parse.server";
import fs from "fs"
import { GlobalInfo } from "~/components/GlobalInfo";
import { Options } from "~/components/Options";
import SearchBar from "~/components/SearchBar";
import { Spacer } from "~/components/Spacer";
import { Legend } from "~/components/Legend";

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

export const loader: LoaderFunction = async () => {
  const data = await parse()
  return json<ParserData>(data)
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
          <Legend />
        </SidePanel>
        <Main />
      </Container>
    </Providers>
  );
}
