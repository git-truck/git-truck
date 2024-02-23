/* eslint-disable react-hooks/exhaustive-deps */
import type { CommitDTO, GitLogEntry, HydratedGitTreeObject } from "~/analyzer/model"
import { Fragment, useEffect, useMemo, useState } from "react"
import { dateFormatLong } from "~/util"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: CommitDTO[]
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: CommitDTO) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: SortCommitsMethods = props.sortBy !== undefined ? props.sortBy : "date"

  const cleanGroupItems: { [key: string]: CommitDTO[] } = sortCommits(props.items, sortMethod)

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
  // const [totalCommitHashes, setTotalCommitHashes] = useState<string[]>([])
  const analyzerData = useData()
  const [commits, setCommits] = useState<CommitDTO[] | null>(null)
  const [commitIndex, setCommitIndex] = useState(0)
  const commitIncrement = 5
  const { clickedObject } = useClickedObject()
  const fetcher = useFetcher()

  function requestCommits() {
    const searchParams = new URLSearchParams()
    searchParams.set("branch", analyzerData.repo.currentHead)
    searchParams.set("repo", analyzerData.analyzerData.repo)
    searchParams.set("skip", commitIndex + "")
    searchParams.set("count", commitIncrement + "")
    fetcher.load(`/commits?${searchParams.toString()}`)
  }

  useEffect(() => {
    if (clickedObject) {
      // TODO: show commits for folder by finding all filechanges with path that starts with folder path, and join with commits
      // let commitHashes: string[] = []
      // if (clickedObject.type === "blob") {
      //   commitHashes = clickedObject.commits.map((a) => a.hash)
      // } else {
      //   commitHashes = calculateCommitsForSubTree(clickedObject).map((a) => a.hash)
      // }
      // setTotalCommitHashes(commitHashes)
      // setCommits(null)
      // setCommitIndex(0)
      // requestCommits(0, commitHashes)
      requestCommits()
    } else {
      setCommitIndex(0)
    }
  }, [clickedObject])

  useEffect(() => {
    if (!clickedObject || commitIndex === 0) return
    requestCommits()
  }, [commitIndex])

  useEffect(() => {
    if (fetcher.state === "idle") {
      const data = fetcher.data as GitLogEntry[] | undefined | null
      if (!data) return
      setCommits((prevCommits) => {
        if (!prevCommits || prevCommits.length === 0) {
          return data
        } else {
          return [...prevCommits, ...data]
        }
      })
    }
  }, [fetcher.data, fetcher.state])

  const headerText = useMemo<string>(() => {
    if (!clickedObject) return ""
    return `Commit history`
  }, [clickedObject, commitIndex])

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
        <CommitDistFragment items={commits} />

        {fetcher.state === "idle" ? (
          // commitIndex + commitIncrement < totalCommitHashes.length ? (
            <span
              onClick={() => setCommitIndex(commitIndex + commitIncrement)}
              className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer"
            >
              Load more commits
            </span>
          // ) : null
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
