import { dateTimeFormatShort } from "~/shared/util"
import { useData } from "~/contexts/DataContext"
import { Code } from "~/components/util"
import { useIsClient } from "~/hooks"
import { Popover } from "~/components/Popover"
import { cn } from "~/styling"

export function AnalysisInfo({ className = "", trigger: trigger }: { className?: string; trigger: React.ReactNode }) {
  const client = useIsClient()
  const { databaseInfo } = useData()

  const isoString = new Date(databaseInfo.lastRunInfo.time).toISOString()
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex w-full items-center justify-between gap-2">
        <Popover triggerOnHover popoverTitle="Analysis details" trigger={() => trigger}>
          <div className="text-secondary-text dark:text-secondary-text-dark grid auto-rows-fr grid-cols-2 items-center gap-0 text-sm">
            <span className="font-bold">Time analyzed</span>
            <time className="text-right" dateTime={isoString} title={isoString}>
              {client ? dateTimeFormatShort(databaseInfo.lastRunInfo.time * 1000) : ""}
            </time>

            <span className="font-bold">As of commit</span>
            <span className="text-right">
              <Code inline>{databaseInfo.lastRunInfo.hash.slice(0, 7)}</Code>
            </span>

            <span className="font-bold">Files analyzed</span>
            <span className="text-right">{databaseInfo.fileCount ?? 0}</span>

            <span className="font-bold">Commits analyzed</span>
            <span className="text-right">{databaseInfo.commitCount}</span>
          </div>
        </Popover>
      </div>
    </div>
  )
}
