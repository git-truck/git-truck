import { LoaderFunctionArgs } from "@remix-run/node"
import { invariant } from "ts-invariant"
import { runProcess } from "~/analyzer/util.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const queryParameters = new URL(request.url).searchParams
  const dir = queryParameters.get("dir")
  const args = queryParameters.get("args")

  invariant(dir, "dir is required")
  invariant(args, "args is required")

  const argsArray = args.split(" ")

  const result = (await runProcess(dir, "git", argsArray)) as string

  return result.trim()
  //  What could be a nice abstraction around this?
  // We currently have the GitCaller class
}

export async function runGitFromClient(dir: string, args: string[]) {
  const url = new URL(window.location.href)
  url.pathname = "/git"
  url.searchParams.set("dir", dir)
  url.searchParams.set("args", args.join(" "))
  return await fetch(url).then((res) => res.text())
}
