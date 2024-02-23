import type { LoaderFunctionArgs } from "@remix-run/node"
import invariant from "tiny-invariant"
import InstanceManager from "~/analyzer/InstanceManager"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const skip = Number(url.searchParams.get("skip"))
  const count = Number(url.searchParams.get("count"))

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []
  return await instance.db.getCommits(skip, count)
}
