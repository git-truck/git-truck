import type { Route } from "./+types/$path"
import { GitCaller } from "~/analyzer/git-caller.server"
import { redirect } from "react-router"

export async function loader({ request }: Route.LoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const path = searchParams.get("path") || "."
  const isGitRepo = await GitCaller.isGitRepo(path)

  throw redirect(`/${isGitRepo ? "view" : "browse"}?path=` + encodeURIComponent(path))
}
