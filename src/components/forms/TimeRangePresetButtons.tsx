import { useQueryStates } from "nuqs"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { TimeUnit } from "~/shared/utils/time"
import { cn } from "~/styling"

const presets: Array<{
  label: string
  durationSecs: number | null // null for special handling (e.g. YTD)
  title: string
  visibleForUnits: TimeUnit[]
}> = [
  { label: "1D", durationSecs: 24 * 60 * 60, title: "Last 24 hours", visibleForUnits: ["day"] },
  {
    label: "7D",
    durationSecs: 7 * 24 * 60 * 60,
    title: "Last 7 days",
    visibleForUnits: ["day", "week"]
  },
  {
    label: "1MO",
    durationSecs: 30 * 24 * 60 * 60,
    title: "Last 1 month",
    visibleForUnits: ["day", "week", "month"]
  },
  {
    label: "3MO",
    durationSecs: 90 * 24 * 60 * 60,
    title: "Last 3 months",
    visibleForUnits: ["day", "week", "month"]
  },
  {
    label: "6MO",
    durationSecs: 180 * 24 * 60 * 60,
    title: "Last 6 months",
    visibleForUnits: ["day", "week", "month"]
  },
  {
    label: "YTD",
    durationSecs: null,
    visibleForUnits: ["day", "week", "month"],
    title: "Year to last change date"
  }, // Special handling for Year To Date
  {
    label: "1YR",
    durationSecs: 1 * 365 * 24 * 60 * 60,
    title: "Last 1 year",
    visibleForUnits: ["day", "week", "month", "year"]
  },
  {
    label: "All",
    durationSecs: Infinity,
    title: "Entire project history",
    visibleForUnits: ["day", "week", "month", "year"]
  }
]

export function TimeRangePresetButtons({ unit }: { unit: TimeUnit }) {
  const data = useData()
  const [, setQs] = useQueryStates(viewSearchParamsConfig)
  const { timerange, selectedRange } = data.databaseInfo

  const projectDuration = timerange[1] - timerange[0]
  const selectionDuration = selectedRange[1] - selectedRange[0]

  return (
    <div className="flex justify-end gap-0">
      {presets.map((preset) => {
        if (!preset.visibleForUnits.includes(unit)) {
          return null
        }
        const isActive =
          (preset.durationSecs === Infinity && selectionDuration === projectDuration) ||
          selectionDuration === preset.durationSecs
        const ytd = new Date(timerange[1] * 1000)
        ytd.setMonth(0, 1)

        const duration = preset.durationSecs ?? timerange[1] - ytd.getTime() / 1000

        return duration <= projectDuration || duration === Infinity ? (
          <button
            key={preset.label}
            className={cn(
              "btn btn--text uppercase",
              isActive
                ? "text-primary-text dark:text-primary-text-dark"
                : "text-tertiary-text dark:text-tertiary-text-dark"
            )}
            title={preset.title}
            onClick={() => {
              const end = data.databaseInfo.timerange[1]
              const start = duration === Infinity ? timerange[0] : end - Math.floor(duration)
              setQs((prev) => ({ ...prev, start, end }))
            }}
          >
            {preset.label}
          </button>
        ) : null
      })}
    </div>
  )
}
