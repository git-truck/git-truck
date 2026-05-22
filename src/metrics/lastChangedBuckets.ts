import { interpolateTurbo } from "d3"
import type { DatabaseInfo, GitTreeObject, HexColor, RawGitObject } from "~/shared/model"

export type LastChangedBucket = {
  text: string
  range: [number, number]
  color: HexColor
}

/**
 * Time thresholds for last changed groupings (in seconds)
 */
const TIMEUNITS = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2629743,
  SIX_MONTHS: 2629743 * 6,
  ONE_YEAR: 31556926,
  TWO_YEARS: 31556926 * 2,
  FOUR_YEARS: 31556926 * 4
}

export function getLastChangedBuckets(dbi: Pick<DatabaseInfo, "newestChangeDate">): LastChangedBucket[] {
  const now = Math.floor(Date.now() / 1000)
  const newestDate = new Date(dbi.newestChangeDate * 1000)
  const today = new Date(now * 1000)

  const isToday =
    newestDate.getFullYear() === today.getFullYear() &&
    newestDate.getMonth() === today.getMonth() &&
    newestDate.getDate() === today.getDate()

  const firstBucketText = isToday ? "Today" : dateFormatShort(dbi.newestChangeDate * 1000)

  const timeDifferences = [
    {
      text: firstBucketText,
      range: [0, TIMEUNITS.ONE_DAY] as [number, number]
    },
    {
      text: "+1d",
      range: [TIMEUNITS.ONE_DAY, TIMEUNITS.ONE_WEEK] as [number, number]
    },
    {
      text: "+1w",
      range: [TIMEUNITS.ONE_WEEK, TIMEUNITS.ONE_MONTH] as [number, number]
    },
    {
      text: "+1m",
      range: [TIMEUNITS.ONE_MONTH, TIMEUNITS.SIX_MONTHS] as [number, number]
    },
    {
      text: "+6m",
      range: [TIMEUNITS.SIX_MONTHS, TIMEUNITS.ONE_YEAR] as [number, number]
    },
    {
      text: "+1y",
      range: [TIMEUNITS.ONE_YEAR, TIMEUNITS.TWO_YEARS] as [number, number]
    },
    {
      text: "+2y",
      range: [TIMEUNITS.TWO_YEARS, TIMEUNITS.FOUR_YEARS] as [number, number]
    },
    {
      text: "+4y",
      range: [TIMEUNITS.FOUR_YEARS, Infinity] as [number, number]
    }
  ].map((group, i, arr) => ({
    ...group,
    color: rgbToHex(interpolateTurbo(1 - i / arr.length))
  }))

  return timeDifferences
}

export function getLastChangedBucketIndex(
  obj: RawGitObject,
  dbi: Pick<DatabaseInfo, "lastChanged" | "newestChangeDate">,
  buckets?: readonly LastChangedBucket[]
): number {
  const epoch = getLastChangedEpoch(obj, dbi.lastChanged)

  if (epoch === undefined || epoch === 0) {
    return -1
  }

  const timeDiff = dbi.newestChangeDate - epoch
  const categories = buckets ?? getLastChangedBuckets(dbi)
  const lastIndex = categories.length - 1
  return categories.findIndex((g, i) =>
    i === lastIndex ? timeDiff >= g.range[0] && timeDiff <= g.range[1] : timeDiff >= g.range[0] && timeDiff < g.range[1]
  )
}

function getLastChangedEpoch(obj: RawGitObject, lastChanged: Record<string, number>): number | undefined {
  if (isGitTreeObject(obj)) {
    return getMaxDescendantLastChanged(obj, lastChanged)
  }
  return lastChanged[obj.path]
}

function getMaxDescendantLastChanged(tree: GitTreeObject, lastChanged: Record<string, number>): number {
  return tree.children.reduce((max, child) => {
    if (child.type === "tree") {
      return Math.max(max, getMaxDescendantLastChanged(child, lastChanged))
    }
    return Math.max(max, lastChanged[child.path] ?? 0)
  }, 0)
}

function isGitTreeObject(obj: RawGitObject): obj is GitTreeObject {
  return obj.type === "tree" && "children" in obj
}

function dateFormatShort(epochTimeMillis: number, options: Intl.DateTimeFormatOptions = {}) {
  return new Date(epochTimeMillis).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...options
  })
}

function rgbToHex(rgb: string): HexColor {
  const [r, g, b] = rgb.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
