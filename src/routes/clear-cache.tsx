import { mdiDeleteForever } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Link, redirect, useFetcher, useLoaderData, useLocation } from "react-router"
import DB from "~/analyzer/DB.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/clear-cache"
import { cn } from "~/styling"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { versionContext } from "~/root"

export const loader = async ({ context }: Route.LoaderArgs) => {
  return { versionInfo: context.get(versionContext) }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const redirectPath = new URL(request.url).searchParams.get("redirect") as string | null
  await InstanceManager.closeAllDBConnections()
  await DB.clearCache()
  throw redirect(redirectPath ?? "/")
}

export function ClearCacheForm({ redirectPath, className = "" }: { redirectPath?: string; className?: string } = {}) {
  const location = useLocation()
  const fetcher = useFetcher({
    key: "clear-cache-form"
  })

  const formAction = `/clear-cache?${new URLSearchParams({
    redirect: redirectPath ?? location.pathname + location.search
  }).toString()}`
  const isTransitioning = fetcher.state !== "idle"

  return (
    <fetcher.Form key={fetcher.state} action={formAction} method="post">
      <button
        type="submit"
        disabled={isTransitioning}
        className={cn("btn btn--danger", className)}
        title="Click here if you are experiencing issues"
      >
        <Icon path={mdiDeleteForever} className="hover-swap inline-block h-full" />
        {isTransitioning ? "Clearing..." : "Clear all data"}
      </button>
    </fetcher.Form>
  )
}

export default function ClearCache() {
  const { versionInfo } = useLoaderData<typeof loader>()

  return (
    <>
      <div className="app-container flex flex-col gap-2 p-2">
        <div className="card">
          <GitTruckInfo installedVersion={versionInfo.installedVersion} latestVersion={versionInfo.latestVersion} />
        </div>
        <div className="card">
          <h1 className="text-2xl font-bold">Clear Git Truck cache</h1>
          <p>
            This will clear all analyzed results and reset the database cache. This is only necessary if you are
            experiencing issues.
          </p>
          <div className="flex h-full place-items-center gap-2 rounded-lg border bg-amber-500/70 p-4 text-white">
            <Icon path={mdiDeleteForever} className="inline-block h-12" />
            <div>
              <span className="font-bold">Warning: </span>
              <span>Merged authors and hidden files will be reset.</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Link to="/" className="btn btn--text">
              Go back
            </Link>
            <ClearCacheForm redirectPath="/" />
          </div>
        </div>
      </div>
    </>
  )
}
