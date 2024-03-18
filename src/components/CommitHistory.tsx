/* eslint-disable react-hooks/exhaustive-deps */
import type { CommitDTO, GitLogEntry } from "~/analyzer/model"
import { Fragment, useEffect, useMemo, useState } from "react"
import { dateFormatLong } from "~/util"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { LegendDot } from "./util"
import { useMetrics } from "~/contexts/MetricContext"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: CommitDTO[]
  count: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: CommitDTO) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"
  const [, authorColors] = useMetrics()
  const cleanGroupItems: { [key: string]: CommitDTO[] } = sortCommits(props.items.slice(0, props.count), sortMethod)

  const items: Array<AccordionData> = new Array<AccordionData>()
  for (const [key, values] of Object.entries(cleanGroupItems)) {
    items.push({
      title: key,
      content: (
        <>
          {values.map((value: CommitDTO) => {
            return (
              <div title={`By: ${value.author}`} className="flex items-center gap-2 overflow-hidden overflow-ellipsis whitespace-pre" key={value.hash + "--itemContentAccordion"}>
                <LegendDot className="ml-1" dotColor={authorColors.get(value.author) ?? "grey"} />
                <li
                  className="cursor-auto font-bold opacity-80"
                  onClick={() => (props.handleOnClick ? props.handleOnClick(value) : null)}
                  >
                  {value.message}
                </li>
              </div>
            )
          })}
        </>
      )
    })
  }

  return (
    <Accordion
      key={items.length > 0 ? items[0].title : new Date().toDateString()}
      titleLabels={true}
      multipleOpen={true}
      openByDefault={true}
      items={items}
    />
  )
}

export function CommitHistory(props: {commitCount: number}) {
  const analyzerData = useData()
  const [commits, setCommits] = useState<CommitDTO[] | null>(null)
  const [commitShowCount, setCommitShowCount] = useState(10)
  const commitIncrement = 10
  const { clickedObject } = useClickedObject()
  const fetcher = useFetcher()

  function fetchCommits() {
    if (!clickedObject) return
    setCommitShowCount((prev) => prev + commitIncrement)
    const searchParams = new URLSearchParams()
    searchParams.set("branch", analyzerData.repodata2.branch)
    searchParams.set("repo", analyzerData.repodata2.repo)
    searchParams.set("path", clickedObject.path)
    searchParams.set("count", (commitShowCount + commitIncrement) + "")
    fetcher.load(`/commits?${searchParams.toString()}`)
  }

  useEffect(() => {
    setCommitShowCount(0)
    fetchCommits()
  }, [clickedObject])

  useEffect(() => {
    if (fetcher.state !== "idle") return
    const data = fetcher.data as GitLogEntry[] | null
    setCommits(data)
  }, [fetcher])

  const headerText = useMemo<string>(() => {
    if (!clickedObject) return ""
    return `Commit history`
  }, [clickedObject, commits])

  if (!clickedObject) return null

  if (!commits) {
    return (
      <>
        <h3 className="font-bold">Commit history</h3>
        <h3>Loading commits...</h3>
      </>
    )
  }

  if (commits.length === 0) {
    return <h3 className="font-bold">No commit history</h3>
  }

  return (
    <>
      <div className="flex justify-between">
        <label className="label grow">
          <h3 className="font-bold">{headerText}</h3>
        </label>
      </div>
      <div>
        <CommitDistFragment items={commits} count={commitShowCount}/>

        {fetcher.state === "idle" ? (
          commitShowCount < props.commitCount ? (
            <span
            onClick={fetchCommits}
            className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer"
            >
              Show more commits
            </span>
          ) : null
        ) : (
          <h3>Loading commits...</h3>
        )}
      </div>
    </>
  )
}

function sortCommits(items: CommitDTO[], method: SortCommitsMethods): { [key: string]: CommitDTO[] } {
  const cleanGroupItems: { [key: string]: CommitDTO[] } = {}
  switch (method) {
    case "author":
      for (const commit of items) {
        const author: string = commit.author
        if (!cleanGroupItems[author]) {
          cleanGroupItems[author] = []
        }
        cleanGroupItems[author].push(commit)
      }
      break
    case "date":
    default:
      for (const commit of items) {
        const date: string = dateFormatLong(commit.committertime)
        if (!cleanGroupItems[date]) {
          cleanGroupItems[date] = []
        }
        cleanGroupItems[date].push(commit)
      }
  }
  return cleanGroupItems
}
