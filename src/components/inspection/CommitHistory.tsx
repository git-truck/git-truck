import type { FileChange, FullCommitDTO } from "~/shared/model"
import { Fragment, useId } from "react"
import { dateFormatRelative, dateTimeFormatShort } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"
import { LegendDot } from "~/components/util"
import { useMetrics } from "~/contexts/MetricContext"
import { Popover } from "~/components/Popover"

type SortCommitsMethods = "date" | "author"

interface CommitDistFragProps {
  items: FullCommitDTO[]
  count: number
  sortBy?: SortCommitsMethods
  handleOnClick?: (commit: FullCommitDTO) => void
}

export function CommitHistoryLabel({ htmlFor }: { htmlFor?: string }) {
  return (
    <label className="label grow" htmlFor={htmlFor}>
      <p className="text-secondary-text dark:text-secondary-text-dark text-xs font-normal">
        Shows the commit history for the selected file or folder.
      </p>
    </label>
  )
}

function CommitDistFragment(props: CommitDistFragProps) {
  const [, contributorColors] = useMetrics()
  const commitDistExpandId = useId()
  const commitsAreCutoff = true

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex justify-between ${commitsAreCutoff ? "hover:text-secondary-text dark:hover:text-secondary-text-dark cursor-pointer" : ""}`}
      >
        <CommitHistoryLabel htmlFor={commitDistExpandId} />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-center">
        {props.items.map((value) => (
          <CommitListEntry
            key={value.hash + "--itemContentAccordion"}
            authorColor={contributorColors.get(value.author.name) ?? "grey"}
            value={value}
          />
        ))}
      </div>
    </div>
  )
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

function formatCoauthors(coauthors: FullCommitDTO["coauthors"]) {
  if (coauthors.length < 1) return "<none>"
  return coauthors.map((coauthor) => `${coauthor.name} <${coauthor.email}>`).join(", ")
}

function FileChangesEntry(props: { fileChanges: FileChange[] }) {
  return (
    <div className="overflow-auto">
      <div className="grid max-w-lg grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1">
        {props.fileChanges.map((filechange) => {
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
    <div
      title={`By: ${props.value.author.name}`}
      className="flex min-w-0 items-center gap-1 overflow-hidden text-ellipsis"
    >
      <LegendDot dotColor={props.authorColor} contributorColorToChange={props.value.author.name} />
      <Popover
        triggerClassName="min-w-0 truncate"
        positions={["right", "bottom", "top", "left"]}
        popoverTitle="Commit Details"
        trigger={({ onClick }) => (
          <button
            className="w-full min-w-0 cursor-pointer truncate text-sm font-bold opacity-80 hover:opacity-70"
            onClick={onClick}
          >
            {props.value.message}
          </button>
        )}
      >
        <div className="grid max-w-lg grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <InfoEntry keyString="Hash" value={props.value.hash} />
          <InfoEntry keyString="Author" value={`${props.value.author.name} <${props.value.author.email}>`} />
          {props.value.committerTime === props.value.authorTime ? (
            <InfoEntry
              keyString="Date"
              value={`${dateTimeFormatShort(props.value.committerTime * 1000)} (${dateFormatRelative(
                props.value.committerTime
              )})`}
            />
          ) : (
            <>
              <InfoEntry
                keyString="Date committed"
                value={`${dateTimeFormatShort(props.value.committerTime * 1000)} (${dateFormatRelative(
                  props.value.committerTime
                )})`}
              />
              <InfoEntry
                keyString="Date authored"
                value={`${dateTimeFormatShort(props.value.authorTime * 1000)} (${dateFormatRelative(
                  props.value.authorTime
                )})`}
              />
            </>
          )}
          <InfoEntry keyString="Message" value={props.value.message} />
          <InfoEntry keyString="Co-authors" value={formatCoauthors(props.value.coauthors)} />
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
        <FileChangesEntry fileChanges={props.value.fileChanges} />
      </Popover>
    </div>
  )
}

export const COMMIT_STEP = 10

export function CommitHistory({
  commits,
  loadedCommitCount,
  totalCommitCount,
  isLoading,
  onCountChange
}: {
  commits: FullCommitDTO[] | null
  loadedCommitCount: number
  totalCommitCount: number
  isLoading: boolean
  onCountChange: () => void
}) {
  const clickedObject = useClickedObject()

  if (!clickedObject) {
    return null
  }

  if (!commits) {
    return (
      <div className="flex flex-col gap-2">
        <CommitHistoryLabel />
        <h3>Loading...</h3>
      </div>
    )
  }

  if (commits.length === 0) {
    return <h3 className="font-bold">No commit history</h3>
  }

  return (
    <>
      <div>
        <CommitDistFragment items={commits} count={loadedCommitCount} />

        {isLoading ? (
          <h3>Loading...</h3>
        ) : loadedCommitCount < totalCommitCount ? (
          <button
            className="text-xs font-medium whitespace-pre opacity-70 hover:cursor-pointer"
            onClick={() => {
              onCountChange()
            }}
          >
            Load more commits
          </button>
        ) : null}
      </div>
    </>
  )
}
