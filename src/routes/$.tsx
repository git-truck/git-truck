import type { Route } from "./+types/$"
import { GitService } from "~/server/git-service"
import { href, redirect } from "react-router"
import { loadViewSearchParams, viewSerializer } from "~/routes/view"
import { browseSerializer } from "~/routes/browse"
import { normalizeAndResolvePath } from "~/shared/util.server"

export async function loader({ request, params }: Route.LoaderArgs) {
  const path = normalizeAndResolvePath(params["*"] ?? loadViewSearchParams(request).path ?? ".")
  const isGitRepo = await GitService.isValidGitRepo(path)

  throw redirect(isGitRepo ? href("/view") + viewSerializer({ path }) : href("/browse") + browseSerializer({ path }))
}
