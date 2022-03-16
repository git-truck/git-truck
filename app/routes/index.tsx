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
  const args = process.argv.slice(2)
  const data = await parse(args)
  return json<ParserData>(data)
}

export default function Index() {
  const data = useLoaderData<ParserData>()

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
