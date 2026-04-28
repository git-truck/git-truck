import { mdiDeleteForever } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { href, redirect, useFetcher, useLocation } from "react-router"
import { AnalysisManager } from "~/server/AnalysisManager"
import type { Route } from "./+types/clear-cache"
import { cn } from "~/styling"
import { versionContext } from "~/root"

export const loader = async ({ context }: Route.LoaderArgs) => {
  return { versionInfo: context.get(versionContext) }
}

export const action = async ({ request }: Route.ActionArgs) => {
  const redirectPath = new URL(request.url).searchParams.get("redirect") as string | null
  if (!redirectPath) {
    throw new Error("Missing redirect path")
  }
  await AnalysisManager.clearAllCaches()
  throw redirect(redirectPath)
}

export function ClearCacheForm({ redirectPath, className = "" }: { redirectPath?: string; className?: string } = {}) {
  const location = useLocation()

  const formAction =
    href("/clear-cache") +
    "?" +
    new URLSearchParams({
      redirect: redirectPath ?? location.pathname + location.search
    }).toString()

  const fetcher = useFetcher()
  const isTransitioning = fetcher.state !== "idle"

  return (
    <fetcher.Form action={formAction} method="post">
      <button
        disabled={isTransitioning}
        className={cn("btn btn--danger", className)}
        title="Click here if you are experiencing issues"
      >
        <Icon path={mdiDeleteForever} className="hover-swap inline-block h-full" />
        {isTransitioning ? "Clearing..." : "Clear cache"}
      </button>
    </fetcher.Form>
  )
}
