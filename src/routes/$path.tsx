import type { Route } from "./+types/$path"
import { GitService } from "~/server/git-service"
import { href, redirect } from "react-router"
import { loadViewSearchParams, viewSerializer } from "~/routes/view"
import { browseSerializer } from "~/routes/browse"

export async function loader({ request, params }: Route.LoaderArgs) {
  const path = params.path ?? loadViewSearchParams(request).path ?? "."

  const isGitRepo = await GitService.isValidGitRepo(path)

  throw redirect(isGitRepo ? href("/view") + viewSerializer({ path }) : href("/browse") + browseSerializer({ path }))
}
