import type { GitLogEntry, HydratedGitBlobObject } from "~/analyzer/model"
import { Fragment, useEffect, useId, useLayoutEffect, useState } from "react"
import { dateFormatLong } from "~/util"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion";
import Accordion from "./accordion/Accordion"
import { ChevronButton } from "./ChevronButton"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext";

export type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: GitLogEntry[]
  commitCutoff: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: GitLogEntry) => void
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  collapsed: boolean
}

function CommitDistFragment(props: CommitDistFragProps) {
  if (!props.items) return null
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"

  const cleanGroupItems: { [ key: string ]: GitLogEntry[] } = sortCommits(props.items, sortMethod)

  const items: Array<AccordionData> = new Array<AccordionData>()
  for (const [ key, values ] of Object.entries(cleanGroupItems)) {
    items.push({
      title: key,
      content: (
        <>
          { values.map((value: GitLogEntry) => {
            return (
              <>
                <li
                  className="cursor-auto"
                  style={{listStyleImage: `url(${commitIcon})`}}
                  onClick={ () => (props.handleOnClick ? props.handleOnClick(value) : null) }
                  key={ value.time + value.message + "--itemContentAccordion" }
                >
                  { value.message }
                </li>
              </>
            )
          }) }
        </>
      ),
    })
  }

  return (
      <Fragment key={ items.length.toString() + sortMethod + props.commitCutoff.toString() + new Date().toDateString() }>
        <Accordion
          titleLabels={ true }
          multipleOpen={ true }
          openByDefault={ true }
          items={ items }
          itemsCutoff={ props.commitCutoff }
          collapsed = {props.collapsed}
          setCollapsed = { props.setCollapsed}
        ></Accordion>
      </Fragment>
  )
}

export function CommitHistory() {
  const [commits, setCommits] = useState<GitLogEntry[] | null>(null)
  const [commitIndex, setCommitIndex] = useState(0)
  const commitIncrement = 5
  const { clickedObject } = useClickedObject()
  const fetcher = useFetcher()

  function requestCommits(index: number) {
    const hashes = (clickedObject as HydratedGitBlobObject).commitsNoTime?.slice(index, index + commitIncrement) ?? []
    fetcher.load(`/commits?commits=${hashes.join(",")}`)
  }

  useEffect(() => {
    if (clickedObject) {
      setCommits(null)
      setCommitIndex(0)
      requestCommits(0)
    }
  }, [clickedObject])

  useEffect(() => {
    if (!clickedObject || commitIndex === 0) return 
    requestCommits(commitIndex)
  }, [commitIndex])

  useEffect(() => {
    if(fetcher.state === "idle") {
      const data = fetcher.data as GitLogEntry[] | undefined | null
      if (!data) return
      if (!commits || commits.length === 0) {
        setCommits(data)
      } else {
        setCommits([...commits, ...data])
      }
    }
  }, [fetcher.state])
  
  const commitHistoryExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(false)

  if (!clickedObject || clickedObject.type !== "blob") return null

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
        <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">
          { <p>No commits found</p>}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex cursor-pointer justify-between hover:opacity-70">
        <label className="label grow">
          <h3 className="font-bold">Commit history ({Math.min(clickedObject.noCommits,commitIndex + commitIncrement)} of {clickedObject.noCommits} shown)</h3>
        </label>
        <ChevronButton id={commitHistoryExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
      </div>
      <div>
        <CommitDistFragment commitCutoff={ collapsed ? commitIncrement : commits.length } items={ commits } setCollapsed={setCollapsed} collapsed/>
        
        {collapsed && commits.length > commitIncrement
        ? <span className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer" onClick={() => setCollapsed(false)}>Show more commits</span>
        :
        fetcher.state === "idle" ? (
          commitIndex + commitIncrement < clickedObject.noCommits ?
              <span onClick={() => setCommitIndex(commitIndex + commitIncrement)} className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer">Load more commits</span>
              : null
        )
          : <h3>Loading commits...</h3>
        }
      </div>
    </>
  )
}

function sortCommits(items: GitLogEntry[], method: SortCommitsMethods): { [ key: string ]: GitLogEntry[] } {
  const cleanGroupItems: { [ key: string ]: GitLogEntry[] } = {}
  switch (method) {
    case "author":
      for (const commit of items) {
        const author: string = commit.author
        if (!cleanGroupItems[ author ]) {
          cleanGroupItems[ author ] = []
        }
        cleanGroupItems[ author ].push(commit)
      }
      break
    case "date":
    default:
      for (const commit of items) {
        const date: string = dateFormatLong(commit.time)
        if (!cleanGroupItems[ date ]) {
          cleanGroupItems[ date ] = []
        }
        cleanGroupItems[ date ].push(commit)
      }
  }
  return cleanGroupItems
}
