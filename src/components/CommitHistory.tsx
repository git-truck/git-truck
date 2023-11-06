import type { GitLogEntry, HydratedGitTreeObject } from "~/analyzer/model"
import { Fragment, useEffect, useId, useState } from "react"
import { dateFormatLong } from "~/util"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { ChevronButton } from "./ChevronButton"
import type { CommitsPayload } from "~/routes/commits"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: GitLogEntry[]
  commitCutoff: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: GitLogEntry) => void
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  collapsed: boolean
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"

  const cleanGroupItems: { [key: string]: GitLogEntry[] } = sortCommits(props.items, sortMethod)

  const items: Array<AccordionData> = new Array<AccordionData>()
  for (const [key, values] of Object.entries(cleanGroupItems)) {
    items.push({
      title: key,
      content: (
        <>
          {values.map((value: GitLogEntry) => {
            return (
              <li
                className="cursor-auto"
                style={{ listStyleImage: `url(${commitIcon})` }}
                onClick={() => (props.handleOnClick ? props.handleOnClick(value) : null)}
                key={value.hash + "--itemContentAccordion"}
              >
                {value.message}
              </li>
            )
          })}
        </>
      ),
    })
  }

  return (
    <Fragment key={items.length.toString() + sortMethod + props.commitCutoff.toString() + new Date().toDateString()}>
      <Accordion
        titleLabels={true}
        multipleOpen={true}
        openByDefault={true}
        items={items}
        itemsCutoff={props.commitCutoff}
        collapsed={props.collapsed}
        setCollapsed={props.setCollapsed}
      ></Accordion>
    </Fragment>
  )
}

export function CommitHistory() {
  const [commits, setCommits] = useState<GitLogEntry[] | null>(null)
  const [lastClicked, setLastClicked] = useState("")
  const [commitIndex, setCommitIndex] = useState(0)
  const commitIncrement = 5
  const { clickedObject } = useClickedObject()

  const fetcher = useFetcher()

  useEffect(() => {
    if (clickedObject && clickedObject.path !== lastClicked) {
      setLastClicked(clickedObject.path)
      setCommits(null)
      setCommitIndex(0)
    }
  }, [clickedObject])

  useEffect(() => {
    if (!clickedObject) return
    fetcher.load(
      `/commits?path=+${clickedObject.path}&isFile=${
        clickedObject.type === "blob"
      }&skip=${commitIndex}&count=${commitIncrement}`,
    )
  }, [commitIndex])

  useEffect(() => {
    if (fetcher.state === "idle") {
      const data = fetcher.data as CommitsPayload
      if (!data) return
      if (!commits || commits.length === 0) {
        setCommits(data.commits)
      } else {
        setCommits([...commits, ...data.commits])
      }
    }
  }, [fetcher.state])

  const commitHistoryExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)

  if (!commits) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        <h3>Loading commits...</h3>
      </>
    )
  }

  if (commits.length === 0) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">{<p>No commits found</p>}</div>
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
      <div>
        <CommitDistFragment
          commitCutoff={collapsed ? commitIncrement : commits.length}
          items={commits}
          setCollapsed={setCollapsed}
          collapsed
        />
        {fetcher.state === "idle" ? (
          <h3
            onClick={() => setCommitIndex(commitIndex + commitIncrement)}
            className="cursor-pointer justify-between hover:opacity-70"
          >
            Load more commits
          </h3>
        ) : (
          <h3>Loading commits...</h3>
        )}
      </div>
    </>
  )
}

function sortCommits(items: GitLogEntry[], method: SortCommitsMethods): { [key: string]: GitLogEntry[] } {
  const cleanGroupItems: { [key: string]: GitLogEntry[] } = {}
  switch (method) {
    case "author":
      items.map((commit) => {
        const author: string = commit.author
        if (!cleanGroupItems[author]) {
          cleanGroupItems[author] = []
        }
        cleanGroupItems[author].push(commit)
        return commit
      })
      break
    case "date":
    default:
      items.map((commit) => {
        const date: string = commit.time ? dateFormatLong(commit.time) : "unknown"
        if (!cleanGroupItems[date]) {
          cleanGroupItems[date] = []
        }
        cleanGroupItems[date].push(commit)
        return commit
      })
  }
  return cleanGroupItems
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
