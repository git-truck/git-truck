/* eslint-disable react-hooks/exhaustive-deps */
import type { GitLogEntry, HydratedGitTreeObject } from "~/analyzer/model"
import { useEffect, useMemo, useState } from "react"
import { dateFormatLong } from "~/util"
import commitIcon from "~/assets/commit_icon.png"
import type { AccordionData } from "./accordion/Accordion"
import Accordion from "./accordion/Accordion"
import { useFetcher } from "@remix-run/react"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { SortingMethods, SortingOrders, useOptions } from "~/contexts/OptionsContext"
import type { CommitSortingMethodsType } from "~/contexts/OptionsContext"

interface CommitDistFragProps {
  items: GitLogEntry[]
  sortBy?: CommitSortingMethodsType
  handleOnClick?: (commit: GitLogEntry) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const sortMethod: CommitSortingMethodsType = props.sortBy !== undefined ? props.sortBy : "DATE"
  const { commitSortingOrdersType, commitSortingMethodsType } = useOptions()
  const isDateSortingMethod: boolean = commitSortingMethodsType == Object.keys(SortingMethods)[0]
  const isDefaultSortingOrdersSelected: boolean =
    commitSortingOrdersType == Object.keys(SortingOrders(isDateSortingMethod))[0]

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
                key={value.hash + "--itemContentAccordion"}
                title={`By: ${value.author}`}
              >
                <button onClick={() => (props.handleOnClick ? props.handleOnClick(value) : null)}>
                  {value.message}
                </button>
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
      items={isDefaultSortingOrdersSelected ? items : items.reverse()}
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
  const [totalCommitHashes, setTotalCommitHashes] = useState<string[]>([])
  const analyzerData = useData()
  const [commits, setCommits] = useState<GitLogEntry[] | null>(null)
  const [commitIndex, setCommitIndex] = useState(0)
  const commitIncrement = 5
  const { clickedObject } = useClickedObject()
  const fetcher = useFetcher()
  const { commitSortingMethodsType, commitSearch } = useOptions()

  function requestCommits(index: number, commitHashes?: string[]) {
    const searchParams = new URLSearchParams()
    const commitHashesToRequest = commitHashes ?? totalCommitHashes
    searchParams.set("commits", commitHashesToRequest.slice(index, index + commitIncrement).join(","))
    searchParams.set("branch", analyzerData.repo.currentHead)
    searchParams.set("repo", analyzerData.repo.path)
    fetcher.load(`/commits?${searchParams.toString()}`)
  }

  useEffect(() => {
    if (clickedObject) {
      let commitHashes: string[] = []
      if (clickedObject.type === "blob") {
        commitHashes = clickedObject.commits.map((a) => a.hash)
      } else {
        commitHashes = calculateCommitsForSubTree(clickedObject).map((a) => a.hash)
      }
      setTotalCommitHashes(commitHashes)
      setCommits(null)
      setCommitIndex(0)
      requestCommits(0, commitHashes)
    }
  }, [clickedObject])

  useEffect(() => {
    if (!clickedObject || commitIndex === 0) return
    requestCommits(commitIndex)
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

  const footerText = useMemo<string>(() => {
    if (!clickedObject) return ""
    return `(${Math.min(totalCommitHashes.length, commitIndex + commitIncrement)} of ${
      totalCommitHashes.length
    } loaded)`
  }, [clickedObject, totalCommitHashes, commitIndex])

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
      <div>
        <CommitDistFragment
          items={
            commitSearch != ""
              ? commits.filter((commit: GitLogEntry) =>
                  commit.message.toLowerCase().includes(commitSearch.toLowerCase())
                )
              : commits
          }
          sortBy={commitSortingMethodsType}
        />

        {fetcher.state === "idle" ? (
          commitIndex + commitIncrement < totalCommitHashes.length ? (
            <button
              onClick={() => setCommitIndex(commitIndex + commitIncrement)}
              className="whitespace-pre text-xs font-medium opacity-70 hover:cursor-pointer"
            >
              Load more commits {footerText}
            </button>
          ) : (
            <span className="whitespace-pre text-xs font-medium opacity-70">{footerText}</span>
          )
        ) : (
          <h3>Loading commits...</h3>
        )}
      </div>
    </>
  )
}

function sortCommits(items: GitLogEntry[], method: CommitSortingMethodsType): { [key: string]: GitLogEntry[] } {
  const cleanGroupItems: { [key: string]: GitLogEntry[] } = {}
  switch (method) {
    // case AUTHOR
    case Object.keys(SortingMethods)[1]:
      for (const commit of items) {
        const author: string = commit.author
        if (!cleanGroupItems[author]) {
          cleanGroupItems[author] = []
        }
        cleanGroupItems[author].push(commit)
      }
      break
    // case DATE
    case Object.keys(SortingMethods)[0]:
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
