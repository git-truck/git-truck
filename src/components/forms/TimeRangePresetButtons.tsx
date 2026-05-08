import { useQueryStates } from "nuqs"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import { cn } from "~/styling"

const presets = [
  { label: "24H", durationSecs: 24 * 60 * 60, title: "24 hours" },
  { label: "7D", durationSecs: 7 * 24 * 60 * 60, title: "7 days" },
  { label: "30D", durationSecs: 30 * 24 * 60 * 60, title: "30 days" },
  { label: "3MO", durationSecs: 90 * 24 * 60 * 60, title: "3 months" },
  { label: "6MO", durationSecs: 180 * 24 * 60 * 60, title: "6 months" },
  { label: "YTD", durationSecs: null }, // Special handling for Year To Date
  { label: "1YR", durationSecs: 1 * 365 * 24 * 60 * 60, title: "" },
  { label: "All", durationSecs: Infinity }
]

export function TimeRangePresetButtons() {
  const data = useData()
  const [,setQs] = useQueryStates(viewSearchParamsConfig)
  const { timerange, selectedRange } = data.databaseInfo

  const projectDuration = timerange[1] - timerange[0]
  const selectionDuration = selectedRange[1] - selectedRange[0]

  return (
    <div className="flex justify-end gap-0">
      {presets.map((preset) => {
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
