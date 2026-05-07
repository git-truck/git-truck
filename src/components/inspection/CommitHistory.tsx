import type { FileChange, FullCommitDTO } from "~/shared/model"
import { Fragment } from "react"
import { dateFormatCalendar, dateFormatRelative, dateTimeFormatShort } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"
import { LegendDot } from "~/components/util"
import { useMetrics } from "~/contexts/MetricContext"
import { Popover } from "~/components/Popover"
import { MetricInspectionPanel } from "~/components/inspection/MetricInspectionPanel"
import { PaginatedList } from "~/components/inspection/util/PaginatedList"

function GenericEntry(props: { keyString: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-secondary-text dark:text-secondary-text-dark flex grow overflow-hidden text-sm font-bold text-ellipsis whitespace-pre">
        {props.keyString}
      </div>
      {props.children}
    </>
  )
}

function InfoEntry(props: { keyString: string; value: string }) {
  return (
    <>
      <div className="text-secondary-text dark:text-secondary-text-dark flex grow overflow-hidden text-sm font-bold text-ellipsis whitespace-pre">
        {props.keyString}
      </div>
      <p className="text-sm text-ellipsis">{props.value}</p>
    </>
  )
}

function FileChangesEntry(props: { fileChanges: FileChange[] }) {
  return (
    <div className="overflow-auto">
      <div className="grid max-h-64 max-w-lg grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1 overflow-auto">
        {props.fileChanges.map((filechange) => {
          return (
            <Fragment key={filechange.path}>
              <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre text-green-600">
                +{filechange.insertions.toLocaleString()}
              </div>
              <div className="flex grow overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre text-red-600">
                -{filechange.deletions.toLocaleString()}
              </div>
              <div
                className="flex grow flex-row overflow-hidden text-sm text-ellipsis whitespace-nowrap"
                title={filechange.path}
              >
                <p className="text-tertiary-text dark:text-tertiary-text-dark">
                  {filechange.path.split("/").slice(0, -1).join("/") + "/"}
                </p>
                <p className="text-secondary-text dark:text-secondary-text-dark font-semibold">
                  {filechange.path.split("/").pop()}
                </p>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

function CommitListEntry(props: { value: FullCommitDTO }) {
  const [, contributorColors] = useMetrics()
  return (
    <>
      <div className="w-min-content flex min-w-5.5 items-start">
        <div className="flex-end flex flex-row-reverse items-center">
          {props.value.coauthors.length > 0
            ? props.value.coauthors
                .filter((coauthor) => coauthor.name != props.value.author.name)
                .slice(0, 2)
                .map((coauthor) => {
                  const coauthorColor = contributorColors.get(coauthor.name) ?? "grey"
                  return (
                    <LegendDot
                      key={props.value.hash + coauthor.email + coauthorColor}
                      title={coauthor.name}
                      dotColor={coauthorColor}
                      className="z-0 -ml-2.5"
                    />
                  )
                })
            : null}
          {(() => {
            const authorColor = contributorColors.get(props.value.author.name) ?? "grey"
            return (
              <LegendDot
                key={props.value.hash + props.value.author.email + authorColor}
                dotColor={authorColor}
                title={props.value.author.name}
                className="z-0"
              />
            )
          })()}
        </div>
      </div>
      <Popover
        triggerClassName="flex min-w-0 w-full h-full items-center truncate hover:opacity-60"
        positions={["right", "bottom", "top", "left"]}
        popoverTitle="Commit Details"
        trigger={({ onClick }) => (
          <>
            <button
              className="h-full w-full min-w-0 cursor-pointer truncate text-start text-sm font-bold"
              onClick={onClick}
            >
              <div className="align-center flex flex-row items-center gap-1">
                <p className="align-center text-secondary-text dark:text-secondary-text-dark text-xs">
                  {dateFormatCalendar(props.value.committerTime * 1000)}
                </p>
                <p className="text-tertiary-text dark:text-tertiary-text-dark text-xs">{props.value.message}</p>
              </div>
            </button>
          </>
        )}
      >
        <div className="grid max-w-lg grid-cols-[max-content_auto] gap-x-3 gap-y-1">
          <InfoEntry keyString="Hash" value={props.value.hash} />
          <GenericEntry keyString="Author">
            <div className="grid grid-cols-[max-content_max-content_auto] items-center gap-1 text-sm">
              <LegendDot dotColor={contributorColors.get(props.value.author.name) ?? "grey"} />
              <span title={props.value.author.name} className="text-ellipsis">
                {props.value.author.name}
              </span>
              <span className="text-tertiary-text dark:text-tertiary-text-dark truncate">
                &nbsp;{`<${props.value.author.email}>`}
              </span>
            </div>
          </GenericEntry>
          {props.value.coauthors.length > 0 ? (
            <GenericEntry keyString="Co-authors">
              <div className="flex flex-col gap-y-1">
                {props.value.coauthors.map((coauthor) => (
                  <div
                    key={coauthor.email}
                    className="grid grid-cols-[max-content_max-content_auto] items-center gap-1 text-sm"
                  >
                    <LegendDot dotColor={contributorColors.get(coauthor.name) ?? "grey"} />
                    <span title={coauthor.name} className="text-ellipsis">
                      {coauthor.name}
                    </span>
                    <span title={coauthor.email} className="text-tertiary-text dark:text-tertiary-text-dark truncate">
                      &nbsp;{`<${coauthor.email}>`}
                    </span>
                  </div>
                ))}
              </div>
            </GenericEntry>
          ) : null}
          {props.value.committerTime === props.value.authorTime ? (
            <GenericEntry keyString="Date">
              <div className="text-sm">
                {dateTimeFormatShort(props.value.committerTime * 1000)}
                <span className="text-tertiary-text dark:text-tertiary-text-dark">
                  {" (" + dateFormatRelative(props.value.committerTime) + " ago)"}
                </span>
              </div>
            </GenericEntry>
          ) : (
            <>
              <GenericEntry keyString="Date committed">
                <div className="text-sm">
                  {dateTimeFormatShort(props.value.committerTime * 1000)}
                  <span className="text-tertiary-text dark:text-tertiary-text-dark">
                    {" (" + dateFormatRelative(props.value.committerTime) + " ago)"}
                  </span>
                </div>
              </GenericEntry>
              <GenericEntry keyString="Date authored">
                <div className="text-sm">
                  {dateTimeFormatShort(props.value.authorTime * 1000)}
                  <span className="text-tertiary-text dark:text-tertiary-text-dark">
                    {" (" + dateFormatRelative(props.value.authorTime) + " ago)"}
                  </span>
                </div>
              </GenericEntry>
            </>
          )}
          <GenericEntry keyString="Message">
            <div className="flex h-full items-center text-sm text-ellipsis">{props.value.message}</div>
          </GenericEntry>
          <GenericEntry keyString="Body">
            <div className="text-tertiary-text dark:text-tertiary-text-dark flex max-h-64 items-center overflow-auto text-xs font-semibold text-ellipsis whitespace-pre-wrap">
              {props.value.body.length > 0 ? props.value.body : "<none>"}
            </div>
          </GenericEntry>
          <GenericEntry keyString="File changes">
            <div className="flex flex-row gap-0 text-sm">
              <p>
                <b>{props.value.fileChanges.length}</b> files {"("}
                <b className="font-bold text-green-600">
                  {"+" + props.value.fileChanges.reduce((acc, curr) => acc + curr.insertions, 0)}
                </b>
                ,&nbsp;
                <b className="font-bold text-red-600">
                  {"-" + props.value.fileChanges.reduce((acc, curr) => acc + curr.deletions, 0)}
                </b>
                {")"}
              </p>
            </div>
          </GenericEntry>
        </div>
        <FileChangesEntry fileChanges={props.value.fileChanges} />
      </Popover>
    </>
  )
}

export const COMMIT_STEP = 15

export function CommitHistory({
  commits,
  loadedCommitCount,
  totalCommitCount,
  isLoading,
  onShowMoreCommits
}: {
  commits: FullCommitDTO[] | null
  loadedCommitCount: number
  totalCommitCount: number
  isLoading: boolean
  onShowMoreCommits: () => void
}) {
  const clickedObject = useClickedObject()
  const totalPages = Math.ceil(totalCommitCount / COMMIT_STEP)
  return (
    <>
      <MetricInspectionPanel
        className="mt-0"
        title={"Commit History"}
        metricMenuItems={[]}
        description={"Shows the commit history for " + clickedObject.path + ". Click on a commit to see details."}
      >
        <PaginatedList
          className={isLoading ? "opacity-60" : ""}
          items={commits ?? []}
          itemsPerPage={COMMIT_STEP}
          totalPages={totalPages}
          itemHeight={20}
          originalItemsCount={COMMIT_STEP}
          onNextFunc={loadedCommitCount < totalCommitCount ? onShowMoreCommits : undefined}
        >
          {(paginatedCommits) => (
            <div className="grid grid-cols-[max-content_auto] items-center justify-start gap-x-1 gap-y-1">
              {paginatedCommits.map((value) => (
                <CommitListEntry key={value.hash + "--itemContentAccordion"} value={value} />
              ))}
            </div>
          )}
        </PaginatedList>
      </MetricInspectionPanel>
    </>
  )
}
