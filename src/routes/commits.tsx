import type { LoaderFunctionArgs } from "@remix-run/node"
import invariant from "tiny-invariant"
import InstanceManager from "~/analyzer/InstanceManager"
import { removeFirstPart } from "~/util"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const branch = url.searchParams.get("branch")
  const repo = url.searchParams.get("repo")
  const path = url.searchParams.get("path")
  const count = url.searchParams.get("count")

  invariant(branch, "branch is required")
  invariant(repo, "repo is required")
  invariant(path, "path is required")
  invariant(count, "count is required")

  const instance = InstanceManager.getInstance(repo, branch)
  if (!instance) return []
      
  const commitHashes = await instance.db.getCommitHashes(removeFirstPart(path), Number(count))
  const gitLogResult = await instance.gitCaller.gitLogSpecificCommits(commitHashes)
  return await instance.getFullCommits(gitLogResult)
}
