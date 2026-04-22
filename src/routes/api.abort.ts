import { createSerializer, parseAsString } from "nuqs"
import type { Route } from "./+types/api.abort"
import { createLoader } from "nuqs/server"
import InstanceManager from "~/analyzer/InstanceManager.server"

const abortSearchParamsConfig = {
  path: parseAsString,
  branch: parseAsString
}

const loadAbortSearchParams = createLoader(abortSearchParamsConfig)

export const abortSerializer = createSerializer(abortSearchParamsConfig)

export const action = async ({ request }: Route.ActionArgs) => {
  const { path, branch } = loadAbortSearchParams(request)
  if (!path || !branch) {
    throw new Response("Missing path or branch", { status: 400 })
  }

  if (!(await InstanceManager.abortInstance({ repositoryPath: path, branch }))) {
    throw new Response("Instance not found", { status: 404 })
  }

  return null
}
