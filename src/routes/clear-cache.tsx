import { mdiDeleteForever } from "@mdi/js"
import Icon from "@mdi/react"
import { redirect, useFetcher, useLocation, useNavigation } from "react-router"
import DB from "~/analyzer/DB.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/clear-cache"
import { useEffect, useState } from "react"
import { cn } from "~/styling"

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
    <fetcher.Form action={formAction} method="post" key={fetcher.state}>
      <button
        type="submit"
        disabled={isTransitioning}
        onClick={(event) => {
          event.preventDefault()
          fetcher.submit(event.currentTarget.form)
        }}
        className={cn("btn", className)}
        title="Click here if you are experiencing issues"
      >
        <Icon path={mdiDeleteForever} className="hover-swap inline-block h-full" />
        {isTransitioning ? "Clearing..." : "Clear analyzed results"}
      </button>
    </fetcher.Form>
  )
}

export default function ClearCache() {
  const navigation = useNavigation()
  const isTransitioning = navigation.state !== "idle"

  return (
    <div className="card m-2 mx-auto flex max-w-xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Clear Cache</h1>
      <p>This will clear all analyzed results and reset the database cache. Use this if you are experiencing issues.</p>
      <div className="flex h-full place-items-center gap-2 rounded-lg bg-orange-500/70 p-4 text-white">
        <Icon path={mdiDeleteForever} className="inline-block h-12" />
        <div>
          <span className="font-bold">Warning: </span>
          <span>Merged authors and hidden files will be deleted.</span>
        </div>
      </div>
      <ClearCacheForm className="text-orange-700" redirectPath="/" />
    </div>
  )
}
