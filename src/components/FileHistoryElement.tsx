import type { GitLogEntry, HydratedGitObject } from "~/analyzer/model"
import { Fragment, useId, useState } from "react"
import { dateFormatLong } from "~/util"
import { ChevronButton } from "./ChevronButton"
import type { CommitsPayload } from "~/routes/commits"

interface props {
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitObject
  commitsPayload: CommitsPayload | null
}

export function FileHistoryElement(props: props) {
  return <CommitHistory commitsPayload={props.commitsPayload} />
}

interface CommitDistFragProps {
  items: GitLogEntry[]
  show: boolean
}

export function CommitDistFragment(props: CommitDistFragProps) {
  if (!props.show) return null

  return (
    <>
      {props.items.map((commit) => {
        return (
          <Fragment key={commit.time.toString() + commit.message}>
            <span
              className="overflow-hidden overflow-ellipsis whitespace-pre text-sm font-bold opacity-80"
              title={commit.message + " (" + commit.author + ")"}
            >
              {commit.message}
            </span>
            <p className="break-all text-right text-sm">{dateFormatLong(commit.time)}</p>
          </Fragment>
        )
      })}
    </>
  )
}

function CommitHistory(props: { commitsPayload: CommitsPayload | null}) {
  const commitHistoryExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)
  const commits = (props.commitsPayload) ? props.commitsPayload.commits : []
  const commitCutoff = 2

  const lessThanCutOff = commits.length <= commitCutoff + 1
  if (lessThanCutOff) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        {props.commitsPayload !== null ? (
        <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">
          {commits.length > 0 ? <CommitDistFragment show={true} items={commits} /> : <p>No commits found</p>}
        </div>
        ) : <h3>Loading commits...</h3>
        }
      </>
    )
  }
  return (
    <>
      <div className="flex cursor-pointer justify-between hover:opacity-70">
        <label className="label grow" htmlFor={commitHistoryExpandId}>
          <h3 className="font-bold">Commit history</h3>
        </label>
        <ChevronButton id={commitHistoryExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
      </div>
      <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">
        <CommitDistFragment show={true} items={commits.slice(0, commitCutoff)} />
        <CommitDistFragment show={!collapsed} items={commits.slice(commitCutoff)} />
        {collapsed ? (
          <button className="text-left text-xs opacity-70 hover:opacity-100" onClick={() => setCollapsed(!collapsed)}>
            + {commits.slice(commitCutoff).length} more
          </button>
        ) : null}
      </div>
    </>
  )
}
