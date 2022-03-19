import { json, LoaderFunction, useLoaderData } from "remix";
import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { Providers } from "~/components/Providers";
import { Container } from "~/components/util";
import { SidePanel } from "~/components/SidePanel";
import { Main } from "~/components/Main";
import { ParserData } from "~/parser/model";
import { Parser } from "~/parser/Parser.server";
import { handleArgs } from "~/parser/args-handler.server";

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
  const [cwd, repoDir, branch, out] = handleArgs(args)
  const data = await new Parser(cwd, repoDir, branch, out).parse()
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
