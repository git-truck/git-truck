import type { GitLogEntry, HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { Fragment, useState } from "react"
import { dateFormatLong } from "~/util"
import { useData } from "~/contexts/DataContext"
import { ChevronButton } from "./ChevronButton"

interface props {
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitObject
}

export function FileHistoryElement(props: props) {
  const { analyzerData } = useData()

  let fileCommits: GitLogEntry[] = []
  if (props.clickedObject.type === "blob") {
    fileCommits = props.clickedObject.commits.map((c) => analyzerData.commits[c])
  } else {
    try {
      fileCommits = Array.from(calculateCommitsForSubTree(props.clickedObject))
        .map((c) => analyzerData.commits[c])
        .sort((a, b) => b.time - a.time)
    } catch (e) {
      console.log(e)
    }
  }

  return <CommitHistory commits={fileCommits} />
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
              className="overflow-hidden overflow-ellipsis whitespace-pre text-sm font-bold opacity-70"
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

function CommitHistory(props: { commits: GitLogEntry[] | undefined }) {
  const [collapsed, setCollapsed] = useState<boolean>(true)
  const commits = props.commits ?? []
  const commitCutoff = 2

  if (commits.length <= commitCutoff + 1) {
    return (
      <>
        <h3 className="font-bold">Commit History</h3>
        <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">
          {commits.length > 0 ? <CommitDistFragment show={true} items={commits} /> : <p>No commits found</p>}
        </div>
      </>
    )
  }
  return (
    <>
      <div className="flex justify-between">
        <h3 className="font-bold">Commit History</h3>
        <ChevronButton open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
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

function calculateCommitsForSubTree(tree: HydratedGitTreeObject) {
  const commitSet = new Set<string>()
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
    for (const child of tree.children) {
      if (!child) continue
      if (child.type === "blob") {
        if (!child.commits) continue
        for (const commit of child.commits) {
          commitSet.add(commit)
        }
      } else if (child.type === "tree") {
        subTree(child)
      }
    }
  }
  return commitSet
}
