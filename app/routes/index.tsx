import { json, LoaderFunction, useLoaderData } from "remix";
import { ParserData } from "~/parser/src/model";
import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { parse } from "~/parser/src/parse.server";
import { Providers } from "~/src/components/Providers";
import { Container } from "~/src/components/util";
import { SidePanel } from "~/src/components/SidePanel";
import { Main } from "~/src/components/Main";
import { log } from "~/parser/src/log.server";

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
  const data = await parse(process.argv)
  return json<ParserData>(data)
}

export default function Index() {
  const data = useLoaderData<ParserData>()
  if (process.env.NODE_ENV === "development") log.debug(data)
  return (
    <Providers
      data={data}
    >
      <Container>
        <SidePanel />
        <Main />
      </Container>
    </Providers>
  );
}
