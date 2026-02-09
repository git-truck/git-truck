import { dateTimeFormatShort } from "~/shared/util"
import { useData } from "../contexts/DataContext"
import { Code } from "./util"
import { useIsClient } from "~/hooks"
import { Popover } from "./Popover"
import { cn } from "~/styling"

export function AnalysisInfo({
  className = "",
  title,
  onClick
}: {
  className?: string
  title?: string
  onClick?: () => void
}) {
  const client = useIsClient()
  const { databaseInfo, repo } = useData()

  const isoString = new Date(databaseInfo.lastRunInfo.time).toISOString()
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex w-full items-center justify-between gap-2">
        <Popover
          /**
           * Only trigger on hover if there is an onClick handler, otherwise trigger on click. This is because if there is no onClick handler, the popover will be the only way to access the details, so it should be accessible on hover. If there is an onClick handler, the popover should only be accessible on click to avoid interfering with the button's primary action.
           */
          triggerOnHover={!!onClick}
          popoverTitle="Analysis details"
          trigger={({ onClick: onPopOverClick }) => (
            <button
              title={title}
              className="text-primary-text dark:text-primary-text-dark hover:text-secondary-text dark:hover:text-secondary-text-dark grow cursor-pointer justify-start gap-2 truncate text-xl"
              onClick={onClick ? onClick : onPopOverClick}
            >
              {repo.repositoryName}
            </button>
          )}
        >
          <div className="grid auto-rows-fr grid-cols-2 gap-0">
            <span>Time analyzed</span>
            <time className="text-right" dateTime={isoString} title={isoString}>
              {client ? dateTimeFormatShort(databaseInfo.lastRunInfo.time * 1000) : ""}
            </time>

            <span>As of commit</span>
            <span className="text-right">
              <Code inline>{databaseInfo.lastRunInfo.hash.slice(0, 7)}</Code>
            </span>

            <span>Files analyzed</span>
            <span className="text-right">{databaseInfo.fileCount ?? 0}</span>

            <span>Commits analyzed</span>
            <span className="text-right">{databaseInfo.commitCount}</span>
          </div>
        </Popover>
      </div>
    </div>
  )
}
