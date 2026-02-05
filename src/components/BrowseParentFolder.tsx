import { use } from "react"
import { href, useRouteLoaderData } from "react-router"
import type { loader } from "~/routes/view"

export function BrowseParentFolder() {
  const dataPromise = useRouteLoaderData<typeof loader>(href("/view"))?.dataPromise
  const data = dataPromise ? use(dataPromise) : null

  if (!data) return null

  return <div>{data.repo.parentDirPath}</div>
}
