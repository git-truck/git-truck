import type { Route } from "./+types/$path"
import { GitCaller } from "~/analyzer/git-caller.server"
import { href, redirect } from "react-router"
import { loadViewSearchParams, viewSerializer } from "./view"
import { browseSerializer } from "./browse"

export async function loader({ request, params }: Route.LoaderArgs) {
  const path = params.path ?? loadViewSearchParams(request).path ?? "."

  const isGitRepo = await GitCaller.isValidGitRepo(path)

  throw redirect(isGitRepo ? href("/view") + viewSerializer({ path }) : href("/browse") + browseSerializer({ path }))
}
