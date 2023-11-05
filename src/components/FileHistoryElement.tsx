import type { GitLogEntry, HydratedGitObject } from "~/analyzer/model"
import { Fragment, useId, useState } from "react"
import { dateFormatLong } from "~/util"
import { useData } from "~/contexts/DataContext"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion";
import Accordion from "./accordion/Accordion"
import { ChevronButton } from "./ChevronButton"
import type { CommitsPayload } from "~/routes/commits"

export type SortCommitsMethods = "date" | "author"

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
  commitCutoff: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: GitLogEntry) => void
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  collapsed: boolean
}

export function CommitDistFragment(props: CommitDistFragProps) {
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

function CommitHistory(props: { commitsPayload: CommitsPayload | null}) {
  const commitHistoryExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)
  const commits = (props.commitsPayload) ? props.commitsPayload.commits : []
  const commitCutoff = 2

  if (commits.length == 0) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        {props.commitsPayload !== null ? (
        <div className="grid grid-cols-[1fr,auto] gap-x-1 gap-y-1.5">
          {commits.length > 0 ? <CommitDistFragment commitCutoff={commitCutoff} collapsed setCollapsed={setCollapsed} items={commits} /> : <p>No commits found</p>}
        </div>
        ) : <h3>Loading commits...</h3>
        }
      </>
    )
  }
  return (
    <>
      <div className="flex cursor-pointer justify-between hover:opacity-70">
        <label className="label grow">
          <h3 className="font-bold">Commit history</h3>
        </label>
        <ChevronButton id={commitHistoryExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
      </div>
      <div>
        <CommitDistFragment commitCutoff={ collapsed ? commitCutoff : commits.length } items={ commits } setCollapsed={setCollapsed} collapsed/>
      </div>
    </>
  )
}

function sortCommits(items: GitLogEntry[], method: SortCommitsMethods): { [ key: string ]: GitLogEntry[] } {
  const cleanGroupItems: { [ key: string ]: GitLogEntry[] } = {}
  switch (method) {
    case "author":
      items.map((commit) => {
        const author: string = commit.author
        if (!cleanGroupItems[ author ]) {
          cleanGroupItems[ author ] = []
        }
        cleanGroupItems[ author ].push(commit)
        return commit
      })
      break
    case "date":
    default:
      items.map((commit) => {
        const date: string = dateFormatLong(commit.time)
        if (!cleanGroupItems[ date ]) {
          cleanGroupItems[ date ] = []
        }
        cleanGroupItems[ date ].push(commit)
        return commit
      })
  }
  return cleanGroupItems
}
