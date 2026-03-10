import type { Route } from ".react-router/types/src/routes/+types/git.pull"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseAsString } from "nuqs"
import { createLoader, createSerializer } from "nuqs/server"
import { createContext } from "react-router"
import { inspect, invariant } from "~/shared/util"
import { runProcess } from "~/shared/util.server"

const gitPullSearchParams = {
  path: parseAsString,
  branch: parseAsString
}
const parser = createLoader(gitPullSearchParams)

export const gitPullSerializer = createSerializer(gitPullSearchParams)

const pathContext = createContext<{ path: string; branch: string }>({ path: ".", branch: "HEAD" })

export const middleware: Array<Route.MiddlewareFunction> = [
  ({ request, context }) => {
    const { path, branch } = parser(request)

    invariant(path, "Path cannot be empty")
    invariant(branch, "Branch cannot be empty")

    const resolvedPath = resolve(path)

    if (!existsSync(join(resolvedPath, ".git"))) {
      throw new Response("Not a git repository", { status: 400 })
    }

    if (
      !existsSync(join(resolvedPath, ".git", "refs", "heads", branch)) &&
      !existsSync(join(resolvedPath, ".git", "refs", "remotes", "origin", branch))
    ) {
      throw new Response(`Branch ${branch} not found`, { status: 400 })
    }

    context.set(pathContext, { path: resolvedPath, branch: branch })
  }
]

export async function loader({ context }: Route.LoaderArgs) {
  try {
    const { path, branch } = context.get(pathContext)
    inspect(await runProcess(path, "git", ["fetch"]), { trace: false, label: "fetch" })
    const [ahead, behind] = inspect(
      await runProcess(path, "git", ["rev-list", "--left-right", "--count", `${branch}...origin/${branch}`]),
      { trace: false, label: "rev-list" }
    )
      .split("\t")
      .map(Number)
    return { ahead, behind }
  } catch (error) {
    console.error("Error in git pull loader:", error)
    throw new Response("Failed to pull latest changes", { status: 500 })
  }
}

export async function action({ context }: Route.ActionArgs) {
  try {
    const { path, branch } = context.get(pathContext)

    inspect(await runProcess(path, "git", ["fetch", "origin"]), { trace: false, label: "fetch" })

    const current = inspect(await runProcess(path, "git", ["branch", "--show-current"]), {
      trace: false,
      label: "current-branch"
    }).trim()

    if (current === branch) {
      return inspect(await runProcess(path, "git", ["pull", "origin", branch]), {
        trace: false,
        label: "pull"
      })
    }

    return inspect(await runProcess(path, "git", ["branch", "-f", branch, `origin/${branch}`]), {
      trace: false,
      label: "branch"
    })
  } catch (error) {
    console.error("Error in git pull action:", error)
    throw new Response("Failed to pull latest changes", { status: 500 })
  }
}
