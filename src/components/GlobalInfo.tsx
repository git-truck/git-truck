import { dateTimeFormatShort } from "~/shared/util"
import { useData } from "../contexts/DataContext"
import { Code } from "./util"
import { useIsClient } from "~/hooks"
import { Popover } from "./Popover"
import { cn } from "~/styling"

export function AnalysisInfo({ className = "", trigger: trigger }: { className?: string; trigger: React.ReactNode }) {
  const client = useIsClient()
  const { databaseInfo } = useData()

  const isoString = new Date(databaseInfo.lastRunInfo.time).toISOString()
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex w-full items-center justify-between gap-2">
        <Popover triggerOnHover popoverTitle="Analysis details" trigger={() => trigger}>
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
