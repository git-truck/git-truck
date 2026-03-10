import { useQueryState } from "nuqs"
import { useEffect, useId, useState } from "react"
import { useFetcher, href } from "react-router"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { ChevronButton } from "~/components/ChevronButton"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.contributor-distribution"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"

export function EntityAuthors() {
  const clickedObject = useClickedObject()
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(href("/view/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path }))
    return () => {
      fetcher.reset()
    }
    // For some reason, fetcher does not have a stable identity and causes an infinite loop when added to the dependency array
    // TODO: Consider loading data on tab change instead?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path])

  if (!fetcher.data) {
    return "Loading..."
  }

  return (
    <AuthorDistribution
      className={fetcher.state !== "idle" ? "opacity-60" : ""}
      authorDistribution={fetcher.data.authorDistribution}
    />
  )
}

const authorCutoff = 2

function AuthorDistribution({
  className = "",
  authorDistribution
}: {
  className?: string
  authorDistribution: { author: string; contribs: number }[]
}) {
  const authorDistributionExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)

  const authorsAreCutoff = (authorDistribution?.length ?? 0) > authorCutoff + 1
  const contribSum = !authorDistribution ? 0 : authorDistribution.reduce((acc, curr) => acc + curr.contribs, 0)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={`flex justify-between ${authorsAreCutoff ? "hover:text-secondary-text dark:hover:text-secondary-text-dark cursor-pointer" : ""}`}
      >
        <label className="label grow" htmlFor={authorDistributionExpandId}>
          <h3 className="font-bold">Author distribution</h3>
        </label>
        {authorsAreCutoff ? (
          <ChevronButton id={authorDistributionExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-center gap-1">
        {authorsAreCutoff ? (
          <>
            <AuthorDistFragment show items={authorDistribution.slice(0, authorCutoff)} contribSum={contribSum} />
            <AuthorDistFragment
              show={!collapsed}
              items={authorDistribution.slice(authorCutoff)}
              contribSum={contribSum}
            />
            {collapsed ? (
              <button
                className="cursor-pointer text-left text-xs opacity-70 hover:opacity-100"
                onClick={() => setCollapsed(!collapsed)}
              >
                + {(authorDistribution?.slice(authorCutoff) ?? []).length} more
              </button>
            ) : null}
          </>
        ) : (
          <>
            {(authorDistribution ?? []).length > 0 && hasContributions(authorDistribution) ? (
              <AuthorDistFragment show items={authorDistribution ?? []} contribSum={contribSum} />
            ) : (
              <p>No authors found</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function hasContributions(authors?: { author: string; contribs: number }[] | null) {
  if (!authors) return false
  for (const { contribs } of authors) {
    if (contribs > 0) return true
  }
  return false
}
