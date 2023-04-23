import type { HierarchyRectangularNode } from "d3-hierarchy"
import { compare, valid, clean } from "semver"

export function diagonal(d: HierarchyRectangularNode<unknown>) {
  const dx = d.x1 - d.x0
  const dy = d.y1 - d.y0

  return Math.sqrt(dx ** 2 + dy ** 2)
}

export function dateFormatLong(epochTime?: number) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime * 1000).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function dateFormatShort(epochTime: number) {
  return new Date(epochTime).toLocaleString("da-dk", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function dateTimeFormatShort(epochTime: number) {
  return new Date(epochTime).toLocaleString("da-dk", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })
}

export function dateFormatRelative(epochTime: number) {
  const now = Date.now()
  const hourMillis = 60 * 60 * 1000
  const dayMillis = 24 * hourMillis
  const difference = now - epochTime * 1000
  if (difference < 0) return "Unknown time ago"
  if (difference > dayMillis) {
    const days = Math.floor(difference / dayMillis)
    return `${days} day${days > 1 ? "s" : ""} ago`
  }
  const hours = Math.floor(difference / hourMillis)
  if (hours > 1) return `${hours} hours ago`
  if (hours === 1) return "1 hour ago"
  return "<1 hour ago"
}

export const last = <T>(arr: T[]) => arr[arr.length - 1]

export const allExceptLast = <T>(arr: T[]) => {
  if (arr.length <= 1) return []
  return arr.slice(0, arr.length - 1)
}

export const allExceptFirst = <T>(arr: T[]) => {
  if (arr.length <= 1) return []
  return arr.slice(1)
}

export function getSeparator(path: string) {
  if (path.includes("\\")) return "\\"
  return "/"
}

export const getPathFromRepoAndHead = (repo: string, branch: string) => [repo, encodeURIComponent(branch)].join("/")

export const branchCompare = (a: string, b: string): number => {
  const defaultBranchNames = ["main", "master"]

  if (defaultBranchNames.includes(a)) return -1
  if (defaultBranchNames.includes(b)) return 1

  return a.toLowerCase().localeCompare(b.toLowerCase())
}

export const semverCompare = (a: string, b: string): number => {
  const validA = valid(clean(a))
  const validB = valid(clean(b))

  if (!validA || !validB) {
    if (validA) return 1
    if (validB) return -1
    return a.toLowerCase().localeCompare(b.toLowerCase())
  }

  return compare(validA, validB)
}
