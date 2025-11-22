import { DetailsCard } from "~/components/DetailsCard"
import { cn } from "~/styling"
import { useRepoContext } from "./view"
import { Outlet, redirect } from "react-router"
import type { Route } from "./+types/view.details"

export const HydrateFallback = () => <div>Loading...</div>

export const loader = async ({ request }: Route.LoaderArgs) => {
  if (request.url.endsWith("details")) {
    throw redirect("general")
  }
}

export default function Details() {
  const repoContext = useRepoContext()
  return (
    <DetailsCard
      className={cn(
        "max-h-screen w-[var(--spacing-sidepanel)] overflow-y-auto shadow-sm shadow-black/50 backdrop-blur-sm"
      )}
    >
      <Outlet context={repoContext} />
    </DetailsCard>
  )
}
