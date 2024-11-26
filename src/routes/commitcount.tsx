import type { LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant"
import InstanceManager from "~/analyzer/InstanceManager.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const path = url.searchParams.get("path")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []
  return await instance.db.getCommitCountForPath(path)
}
