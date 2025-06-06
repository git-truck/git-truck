import { redirect } from "react-router"
import { existsSync } from "node:fs"
import path from "node:path"
import { getArgs } from "~/shared/util.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import type { Route } from "./+types/$repository"
import { invariant } from "~/shared/util"

/**
 * Redirect to the repository's default branch
 */
export const loader = async ({ params }: Route.LoaderArgs) => {
  const { repository } = params

  invariant(repository, "Repository is required")

  const args = await getArgs()
  const repositoryPath = path.resolve(args.path, repository)

  invariant(existsSync(repositoryPath), `Repo ${repository} does not exist at path ${repositoryPath}`)
  invariant(await GitCaller.isGitRepo(repositoryPath), `Repo ${repository} is not a git repo`)

  // Get checked out branch and redirect to it

  const currentHead = await GitCaller._getRepositoryHead(repositoryPath)

  return redirect(`/${repository}/${currentHead}`)
}
