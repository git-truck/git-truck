import type { FileChange, FullCommitDTO } from "~/shared/model"
import { Fragment } from "react"
import { dateFormatRelative, dateTimeFormatShort } from "~/shared/util"
import { useLocation, useNavigation, useSearchParams } from "react-router"
import { useClickedObject } from "~/contexts/ClickedContext"
import { LegendDot } from "./util"
import { useMetrics } from "~/contexts/MetricContext"
import { Popover } from "./Popover"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: FullCommitDTO[]
  count: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: FullCommitDTO) => void
}

function CommitDistFragment(props: CommitDistFragProps) {
  const [, authorColors] = useMetrics()

  return props.items.map((value) => (
    <CommitListEntry
      key={value.hash + "--itemContentAccordion"}
      authorColor={authorColors.get(value.author) ?? "grey"}
      value={value}
    />
  ))
}

function InfoEntry(props: { keyString: string; value: string }) {
  return (
    <>
      <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        {props.keyString}
      </div>
      <p className="text-sm break-all text-ellipsis">{props.value}</p>
    </>
  )
}

function FileChangesEntry(props: { filechanges: FileChange[] }) {
  return (
    <div className="max-h-64 overflow-auto">
      <div className="grid max-w-lg grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1">
        {props.filechanges.map((filechange) => {
          return (
            <Fragment key={filechange.path}>
              <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre text-green-600">
                +{filechange.insertions}
              </div>
              <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre text-red-600">
                -{filechange.deletions}
              </div>
              <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">{filechange.path}</div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

function CommitListEntry(props: { value: FullCommitDTO; authorColor: string }) {
  return (
    <div title={`By: ${props.value.author}`} className="flex items-center gap-2 overflow-hidden text-ellipsis">
      <LegendDot className="ml-1" dotColor={props.authorColor} authorColorToChange={props.value.author} />
      <Popover
        positions={["left", "top", "bottom", "right"]}
        popoverTitle="Commit Details"
        trigger={({ onClick }) => (
          <button
            onClick={onClick}
            className="cursor-pointer truncate overflow-hidden font-bold text-ellipsis opacity-80 hover:opacity-70"
          >
            {props.value.message}
          </button>
        )}
      >
        <div className="grid max-w-lg grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <InfoEntry keyString="Hash" value={props.value.hash} />
          <InfoEntry keyString="Author" value={props.value.author} />
          {props.value.committertime === props.value.authortime ? (
            <InfoEntry
              keyString="Date"
              value={`${dateTimeFormatShort(props.value.committertime * 1000)} (${dateFormatRelative(
                props.value.committertime
              )})`}
            />
          ) : (
            <>
              <InfoEntry
                keyString="Date committed"
                value={`${dateTimeFormatShort(props.value.committertime * 1000)} (${dateFormatRelative(
                  props.value.committertime
                )})`}
              />
              <InfoEntry
                keyString="Date authored"
                value={`${dateTimeFormatShort(props.value.authortime * 1000)} (${dateFormatRelative(
                  props.value.authortime
                )})`}
              />
            </>
          )}
          <InfoEntry keyString="Message" value={props.value.message} />
          <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">Body</div>
          <div className="max-h-64 overflow-auto">
            <p className="text-sm break-all text-ellipsis">
              {props.value.body.length > 0 ? props.value.body : "<none>"}
            </p>
          </div>
          <InfoEntry
            keyString="File changes"
            value={
              props.value.fileChanges.length +
              " files (+" +
              props.value.fileChanges.reduce((acc, curr) => acc + curr.insertions, 0) +
              ", -" +
              props.value.fileChanges.reduce((acc, curr) => acc + curr.deletions, 0) +
              ")"
            }
          />
        </div>
        <FileChangesEntry filechanges={props.value.fileChanges} />
      </Popover>
    </div>
  )
}

export function CommitHistory({ commits, commitCount }: { commits: FullCommitDTO[] | null; commitCount: number }) {
  const navigation = useNavigation()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const commitIncrement = 10
  const commitShowCount = Number(searchParams.get("count") ?? String(commitIncrement))
  const { clickedObject } = useClickedObject()

  // function fetchCommits() {
  //   if (!clickedObject) return
  //   setCommitShowCount((prev) => prev + commitIncrement)
  //   const searchParams = new URLSearchParams()
  //   // searchParams.set("branch", analyzerData.databaseInfo.branch)
  //   // searchParams.set("repo", analyzerData.databaseInfo.repo)
  //   searchParams.set("path", clickedObject.path)
  //   searchParams.set("count", commitShowCount + commitIncrement + "")
  //   navigate(`./commits?${searchParams.toString()}`)
  // }

  // useEffect(() => {
  //   setCommitShowCount(0)
  //   fetchCommits()
  // }, [clickedObject])

  // useEffect(() => {
  //   if (fetcher.state !== "idle") return
  //   const data = fetcher.data as FullCommitDTO[] | null
  // }, [fetcher])

  if (!clickedObject) return null

  if (!commits) {
    return (
      <>
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
        <CommitDistFragment items={commits} count={commitShowCount} />

        {navigation.state === "idle" ? (
          commitShowCount < commitCount ? (
            <button
              onClick={() =>
                setSearchParams(
                  (prev) => {
                    prev.set("count", String(Number(prev.get("count") ?? String(commitIncrement)) + commitIncrement))
                    return prev
                  },
                  {
                    state: location.state
                  }
                )
              }
              className="text-xs font-medium whitespace-pre opacity-70 hover:cursor-pointer"
            >
              Show more commits
            </button>
          ) : null
        ) : (
          <h3>Loading commits...</h3>
        )}
      </div>
    </>
  )
}
