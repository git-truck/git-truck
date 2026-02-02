import { DetailsCard } from "~/components/DetailsCard"
import { cn } from "~/styling"
import { currentRepositoryContext, useRepoContext } from "./view"
import { createContext, Outlet, redirect, useLoaderData } from "react-router"
import type { Route } from "./+types/view.details"
import { getPathFromRepoAndHead, invariant } from "~/shared/util"
import { type GitObject, type LinkSearchParams } from "~/shared/model"

export const HydrateFallback = () => <div>Loading...</div>

const clickedObjectContext = createContext<GitObject>()

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  if (new URL(request.url).pathname.match(/details\/?$/)) {
    throw redirect(
      getPathFromRepoAndHead(
        {
          ...Object.fromEntries(new URL(request.url).searchParams.entries())
        } as LinkSearchParams,
        ["view", "details", "general"]
      )
    )
  }

  const currentRepo = context.get(currentRepositoryContext)
  const objectPath = new URL(request.url).searchParams.get("objectPath")

  invariant(objectPath, "objectPath is required")

  const clickedObject: GitObject =
    objectPath !== currentRepo.repositoryPath
      ? await context.get(currentRepositoryContext).instance.db.getObject(objectPath)
      : {
          type: "tree",
          path: currentRepo.repositoryPath,
          name: currentRepo.repositoryName,
          hash: "HEAD",
          children: []
        }
  context.set(clickedObjectContext, clickedObject)
  return clickedObject
}

export default function Details() {
  const repoContext = useRepoContext()
  const clickedObject = useLoaderData<typeof loader>()
  return (
    <DetailsCard
      className={cn({
        // TODO: For absolute positioning of the DetailsCard, these classes should be applied
        "w-sidepanel max-h-screen overflow-y-auto shadow-sm shadow-black/50 backdrop-blur-sm": false })}
      clickedObject={clickedObject}
    >
      <Outlet context={repoContext} />
    </DetailsCard>
  )
}
