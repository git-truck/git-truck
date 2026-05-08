import { $inspect } from "~/shared/util"

export const TimeUnitValues = ["day", "week", "month", "year"] as const

export const TimeUnitToPlural = {
  day: "days",
  week: "weeks",
  month: "months",
  year: "years"
} as const satisfies Record<TimeUnit, string>

export type TimeUnit = (typeof TimeUnitValues)[number]

export const TimeUnitDurationsMs: Record<TimeUnit, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000
}

export const unitToMillis = ({
  startTimeMillis,
  units,
  unit
}: {
  startTimeMillis: number
  units: number
  unit: TimeUnit
}) => startTimeMillis + units * TimeUnitDurationsMs[unit]

export const millisToUnit = ({
  startTimeMillis,
  millis,
  unit
}: {
  startTimeMillis: number
  millis: number
  unit: TimeUnit
}) => (millis - startTimeMillis) / TimeUnitDurationsMs[unit]
