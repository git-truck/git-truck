import { mdiArrowDown, mdiCheckCircle } from "@mdi/js"
import { useQueryStates } from "nuqs"
import { useEffect } from "react"
import { href, useFetcher } from "react-router"
import { Icon } from "~/components/Icon"
import { type action, gitPullSerializer, type loader } from "~/routes/git.pull"
import { viewSearchParamsConfig } from "~/routes/view"

export function PullButton() {
  const statusFetcher = useFetcher<typeof loader>()
  const pullFetcher = useFetcher<typeof action>()
  const [viewSearchParams] = useQueryStates({
    path: viewSearchParamsConfig.path,
    branch: viewSearchParamsConfig.branch
  })

  useEffect(() => {
    statusFetcher.load(
      href("/git/pull") +
        gitPullSerializer({
          path: viewSearchParams.path,
          branch: viewSearchParams.branch
        })
    )
  }, [])

  const behind = statusFetcher.data?.behind

  if (behind === undefined) {
    return null
  }

  if (behind === 0) {
    return (
      <div aria-label="Up to date with origin" title="Up to date with origin">
        <Icon path={mdiCheckCircle} className="text-blue-primary" size={1} />
      </div>
    )
  }

  const label =
    statusFetcher.data?.behind !== undefined
      ? `Pull ${statusFetcher.data?.behind} new commits from origin`
      : "Pull latest changes"

  return (
    <pullFetcher.Form
      className="aria-disabled:opacity-80"
      method="post"
      action={href("/git/pull") + gitPullSerializer({ path: viewSearchParams.path, branch: viewSearchParams.branch })}
      aria-disabled={pullFetcher.state === "submitting"}
    >
      <button
        type="submit"
        className="btn btn-primary"
        aria-label={label}
        title={label}
        disabled={pullFetcher.state === "submitting"}
      >
        <Icon path={mdiArrowDown} />
        {statusFetcher.data ? <span className="badge">{statusFetcher.data?.behind}</span> : null}
      </button>
    </pullFetcher.Form>
  )
}
