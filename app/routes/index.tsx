import { json, LoaderFunction, useLoaderData } from "remix";
import App from "~/src/App";
import fs from "fs"
import { ParserData } from "parser/src/model";
import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"

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
  const jsonData = fs.readFileSync("./data.json", "utf8");
  return json(JSON.parse(jsonData));
}

export default function Index() {
  const data = useLoaderData<ParserData>()
  return (
    <App data={data} />
  );
}
