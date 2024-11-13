import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { invariant } from "ts-invariant"
import InstanceManager from "~/analyzer/InstanceManager.client"

export const clientLoader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const path = url.searchParams.get("path")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return json([])
  return json(await instance.db.getCommitCountForPath(path))
}
