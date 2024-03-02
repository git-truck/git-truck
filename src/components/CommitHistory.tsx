/* eslint-disable react-hooks/exhaustive-deps */
import type { CommitDTO, GitLogEntry, HydratedGitTreeObject } from "~/analyzer/model"
import { Fragment, useEffect, useMemo, useState } from "react"
import { dateFormatLong, removeFirstPart } from "~/util"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: CommitDTO[]
  count: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: CommitDTO) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"

  const cleanGroupItems: { [key: string]: CommitDTO[] } = sortCommits(props.items.slice(0, props.count), sortMethod)

  const items: Array<AccordionData> = new Array<AccordionData>()
  for (const [key, values] of Object.entries(cleanGroupItems)) {
    items.push({
      title: key,
      content: (
        <>
          {values.map((value: CommitDTO) => {
            return (
              <li
                className="cursor-auto"
                style={{ listStyleImage: `url(${commitIcon})` }}
                onClick={() => (props.handleOnClick ? props.handleOnClick(value) : null)}
                key={value.hash + "--itemContentAccordion"}
                title={`By: ${value.author}`}
              >
                {value.message}
              </li>
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

function calculateCommitsForSubTree(tree: HydratedGitTreeObject) {
  const commitMap = new Map<string, number>()
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
    for (const child of tree.children) {
      if (!child) continue
      if (child.type === "blob") {
        if (!child.commits) continue
        for (const commit of child.commits) {
          commitMap.set(commit.hash, commit.time)
        }
      } else if (child.type === "tree") {
        subTree(child)
      }
    }
  }
  const commitArr = []
  for (const [hash, time] of commitMap) commitArr.push({ hash, time })
  commitArr.sort((a, b) => b.time - a.time)
  return commitArr
}

export function CommitHistory() {
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
      <div className="flex cursor-pointer justify-between hover:opacity-70">
        <label className="label grow">
          <h3 className="font-bold">{headerText}</h3>
        </label>
      </div>
      <div>
        <CommitDistFragment items={commits} count={commitShowCount}/>

        {fetcher.state === "idle" ? (
          commitShowCount < (analyzerData.repodata2.commitCounts.get(removeFirstPart(clickedObject.path)) ?? 0) ? (
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
        const date: string = dateFormatLong(commit.time)
        if (!cleanGroupItems[date]) {
          cleanGroupItems[date] = []
        }
        cleanGroupItems[date].push(commit)
      }
  }
  return cleanGroupItems
}
