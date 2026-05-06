import { useData } from "~/contexts/DataContext"
import { useViewSubmit } from "~/hooks"
import { $inspect } from "~/shared/util"
import { cn } from "~/styling"

const presets = [
  { label: "24H", durationSecs: 24 * 60 * 60, title: "24 hours" },
  { label: "7D", durationSecs: 7 * 24 * 60 * 60, title: "7 days" },
  { label: "30D", durationSecs: 30 * 24 * 60 * 60, title: "30 days" },
  { label: "90D", durationSecs: 90 * 24 * 60 * 60, title: "90 days" },
  { label: "6MO", durationSecs: 180 * 24 * 60 * 60, title: "6 months" },
  { label: "YTD", durationSecs: null }, // Special handling for Year To Date
  { label: "1YR", durationSecs: 1 * 365 * 24 * 60 * 60, title: "" },
  { label: "2YR", durationSecs: 2 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "5YR", durationSecs: 5 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "10YR", durationSecs: 10 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "25YR", durationSecs: 25 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "50YR", durationSecs: 50 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "75YR", durationSecs: 75 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "100YR", durationSecs: 100 * 365 * 24 * 60 * 60, title: "Last 24 hours" },
  { label: "All", durationSecs: Infinity }
]

export function TimeRangePresetButtons() {
  const data = useData()
  const submit = useViewSubmit()
  const { timerange, selectedRange } = data.databaseInfo

  const projectDuration = timerange[1] - timerange[0]
  const selectionDuration = selectedRange[1] - selectedRange[0]

  return (
    <div className="flex gap-0 justify-end">
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
            className={cn("btn btn--text uppercase", $inspect(isActive) ? "text-primary-text dark:text-primary-text-dark" : "text-tertiary-text dark:text-tertiary-text-dark")}
            onClick={() => {
              const end = data.databaseInfo.timerange[1]
              const start = duration === Infinity ? timerange[0] : end - Math.floor(duration)
              const form = new FormData()
              form.append("timeseries", `${start}-${end}`)
              submit(form, {
                method: "post"
              })
            }}
          >
            {preset.label}
          </button>
        ) : null
      })}
    </div>
  )
}
