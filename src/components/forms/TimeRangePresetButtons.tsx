import { useQueryStates } from "nuqs"
import { useOptimistic, useMemo, useTransition } from "react"
import { useData } from "~/contexts/DataContext"
import { viewSearchParamsConfig } from "~/routes/viewParams"
import type { TimeUnit } from "~/shared/utils/time"
import { cn } from "~/styling"

const presets: Array<{
  label: string
  durationSecs: number | null // null for special handling (e.g. YTD)
  durationMonths?: number
  title: string
  visibleForUnits: TimeUnit[]
}> = [
  { label: "1d", durationSecs: 24 * 60 * 60, title: "Last 24 hours", visibleForUnits: ["day"] },
  {
    label: "7d",
    durationSecs: 7 * 24 * 60 * 60,
    title: "Last 7 days",
    visibleForUnits: ["day", "week"]
  },
  {
    label: "1m",
    durationSecs: 30 * 24 * 60 * 60,
    durationMonths: 1,
    title: "Last 1 month",
    visibleForUnits: ["day", "week", "month"]
  },
  {
    label: "3m",
    durationSecs: 90 * 24 * 60 * 60,
    durationMonths: 3,
    title: "Last 3 months",
    visibleForUnits: ["day", "week", "month"]
  },
  {
    label: "6m",
    durationSecs: 180 * 24 * 60 * 60,
    durationMonths: 6,
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
    label: "1yr",
    durationSecs: 1 * 365 * 24 * 60 * 60,
    durationMonths: 12,
    title: "Last 1 year",
    visibleForUnits: ["day", "week", "month"]
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
  const { timerange } = data.databaseInfo
  const [qs, setQs] = useQueryStates(
    {
      ...viewSearchParamsConfig,
      start: viewSearchParamsConfig.start.withDefault(timerange[0]),
      end: viewSearchParamsConfig.end.withDefault(timerange[1])
    },
    {
      clearOnDefault: false
    }
  )
  const [, startTransition] = useTransition()
  const selectedRange = useMemo<[number, number]>(() => [qs.start, qs.end], [qs.start, qs.end])
  const [optimisticTimerange, setOptimisticTimerange] = useOptimistic(
    selectedRange,
    (_currentRange, nextRange: [number, number]) => nextRange
  )

  const projectDuration = timerange[1] - timerange[0]

  function getMonthPresetStart(end: number, durationMonths: number) {
    const start = new Date(end * 1000)
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCMonth(start.getUTCMonth() - durationMonths + 1)
    return Math.floor(start.getTime() / 1000)
  }

  function getPresetRange({
    duration,
    durationMonths
  }: {
    duration: number
    durationMonths?: number
  }): [number, number] {
    const end = timerange[1]
    const start =
      unit === "month" && durationMonths
        ? getMonthPresetStart(end, durationMonths)
        : duration === Infinity
          ? timerange[0]
          : end - Math.floor(duration)

    return [start, end]
  }

  return (
    <div className="bg-primary-bg dark:bg-primary-bg-dark flex justify-end gap-0.5 rounded-full p-1">
      {presets.map((preset) => {
        if (!preset.visibleForUnits.includes(unit)) {
          return null
        }
        const ytd = new Date(timerange[1] * 1000)
        ytd.setMonth(0, 1)

        const duration = preset.durationSecs ?? timerange[1] - ytd.getTime() / 1000
        const presetRange = getPresetRange({ duration, durationMonths: preset.durationMonths })
        const isActive =
          (preset.durationSecs === Infinity && optimisticTimerange[1] - optimisticTimerange[0] >= projectDuration) ||
          (optimisticTimerange[0] === presetRange[0] && optimisticTimerange[1] === presetRange[1])

        return duration <= projectDuration || duration === Infinity ? (
          <button
            key={preset.label}
            className={cn(
              "cursor-pointer rounded-full p-1 text-sm transition-opacity hover:opacity-80",
              isActive
                ? "bg-secondary-bg dark:bg-secondary-bg-dark text-primary-text dark:text-primary-text-dark"
                : "text-tertiary-text dark:text-tertiary-text-dark"
            )}
            title={preset.title}
            onClick={() => {
              startTransition(async () => {
                setOptimisticTimerange(presetRange)
                await setQs((prev) => ({ ...prev, start: presetRange[0], end: presetRange[1] }))
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
