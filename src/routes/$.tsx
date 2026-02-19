import type { Route } from "./+types/$"
import { GitCaller } from "~/analyzer/git-caller.server"
import { href, redirect } from "react-router"
import { loadViewSearchParams, viewSerializer } from "./view"
import { browseSerializer } from "./browse"
import { normalizeAndResolvePath } from "~/shared/util.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const path = normalizeAndResolvePath(params["*"] ?? loadViewSearchParams(request).path ?? ".")
  const isGitRepo = await GitCaller.isValidGitRepo(path)

  throw redirect(isGitRepo ? href("/view") + viewSerializer({ path }) : href("/browse") + browseSerializer({ path }))
}
