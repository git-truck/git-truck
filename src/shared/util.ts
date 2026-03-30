import { compare, valid, clean } from "semver"
import colorConvert from "color-convert"
import type { GitObject, GitBlobObject, GitTreeObject, RenameEntry } from "~/shared/model"
import { getLuminance } from "a11y-contrast-color"

export function dateFormatCalendarHeader(epochTime: number) {
  return new Date(epochTime).toLocaleString("en-gb", {
    month: "long",
    year: "numeric"
  })
}

export function dateFormatShort(epochTimeMillis: number, options: Intl.DateTimeFormatOptions = {}) {
  return new Date(epochTimeMillis).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options
  })
}

export function dateFormatISO(epochTimeMillis: number) {
  return new Date(epochTimeMillis).toISOString().split("T")[0]
}

export function dateTimeFormatShort(epochTimeMillis: number) {
  return new Date(epochTimeMillis).toLocaleString("da-dk", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "2-digit"
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

export const last = <T>(arr: T[]) => arr.at(-1)

export const allExceptFirst = <T>(arr: T[]) => {
  if (arr.length <= 1) return []
  return arr.slice(1)
}

export function getSeparator(path: string) {
  if (path.includes("\\")) return "\\"
  return "/"
}

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

const brightnessCalculationCache = new Map<`#${string}`, { isDark: boolean; luminance: number }>()

export const isDarkColor = (color: `#${string}`): { isDark: boolean; luminance: number } => {
  const cachedColor = brightnessCalculationCache.get(color)
  if (cachedColor !== undefined) {
    return cachedColor
  }

  // Verify that the color is a hex color
  if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    throw new Error(`Invalid hex color: ${color}`)
  }

  const luminance = getLuminance(colorConvert.hex.rgb(color))
  const isDark = luminance < 0.5
  brightnessCalculationCache.set(color, { isDark, luminance })

  return { isDark, luminance: luminance }
}

const colorCache = new Map<string, `#${string}`>()

export function hslToHex(h: number, s: number, l: number): `#${string}` {
  const key = `${h}-${s}-${l}`
  const cachedColor = colorCache.get(key)

  if (cachedColor) {
    return cachedColor
  }

  const hex: `#${string}` = `#${colorConvert.hsl.hex([h, s, l])}`
  colorCache.set(key, hex)
  return hex
}

export const isTree = (d: GitObject | null = null): d is GitTreeObject => d?.type === "tree"
export const isBlob = (d: GitObject | null = null): d is GitBlobObject => d?.type === "blob"
export const isRepositoryRoot = (d: GitObject | null = null): boolean => d?.path === d?.name

export function generateVersionComparisonLink({
  currentVersion,
  latestVersion
}: {
  currentVersion: string
  latestVersion: string
}): string {
  return `https://github.com/git-truck/git-truck/compare/v${currentVersion}...v${latestVersion}`
}

export function invariant<T>(condition: T, message: string): asserts condition is NonNullable<T> {
  if (!condition) {
    throw new Error(message)
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getWeek(date: Date): number {
  const tempDate = new Date(date)
  tempDate.setHours(0, 0, 0, 0)
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7))
  const yearStart = new Date(tempDate.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return weekNo
}

export function getTimeIntervals(
  timeUnit: "day" | "week" | "month" | "year",
  minTime: number,
  maxTime: number
): [string, number][] {
  const intervals: [string, number][] = []

  const startDate = new Date(minTime * 1000)
  const endDate = new Date(maxTime * 1000)

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const currTime = currentDate.getTime() / 1000
    switch (timeUnit) {
      case "day": {
        intervals.push([
          currentDate
            .toLocaleDateString("en-gb", { day: "numeric", month: "long", year: "numeric", weekday: "short" })
            .replace(",", ""),
          currTime
        ])
        currentDate.setDate(currentDate.getDate() + 1)
        break
      }
      case "week": {
        const weekNum = getWeek(currentDate)
        intervals.push([`Week ${weekNum < 10 ? "0" : ""}${weekNum} ${currentDate.getFullYear()}`, currTime])
        currentDate.setDate(currentDate.getDate() + 7)
        break
      }
      case "year": {
        intervals.push([currentDate.getFullYear().toString(), currTime])
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        break
      }
      case "month": {
        intervals.push([currentDate.toLocaleString("en-gb", { month: "long", year: "numeric" }), currTime])
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      }
      default:
        throw new Error(`Unsupported time unit: ${timeUnit}`)
    }
  }

  return intervals
}
export function analyzeRenamedFile(
  file: string,
  timestamp: number,
  authortime: number,
  renamedFiles: RenameEntry[],
  repo: string
) {
  const movedFileRegex = /(?:.*{(?<oldPath>.*)\s=>\s(?<newPath>.*)}.*)|(?:^(?<oldPath2>.*) => (?<newPath2>.*))$/gm
  const replaceRegex = /{.*}/gm
  const match = movedFileRegex.exec(file)
  const groups = match?.groups ?? {}
  let oldPath: string
  let newPath: string

  if (groups["oldPath"] || groups["newPath"]) {
    const oldP = groups["oldPath"] ?? ""
    const newP = groups["newPath"] ?? ""
    oldPath = repo + "/" + file.replace(replaceRegex, oldP).replace("//", "/")
    newPath = repo + "/" + file.replace(replaceRegex, newP).replace("//", "/")
  } else {
    oldPath = repo + "/" + (groups["oldPath2"] ?? "")
    newPath = repo + "/" + (groups["newPath2"] ?? "")
  }

  renamedFiles.push({ fromname: oldPath, toname: newPath, timestamp: timestamp, timestampauthor: authortime })
  return newPath
}

export const formatMs = (ms: number) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

/**
 * This functions handles try / catch for you, so your code stays flat.
 * @param promise The promise to handle.
 * @returns A tuple of the result and an error. If there is no error, the error will be null.
 */

export async function promiseHelper<T>(promise: Promise<T>): Promise<[null, Error] | [T, null]> {
  try {
    return [await promise, null]
  } catch (e) {
    return [null, e as Error]
  }
}

export const formatLargeNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  } else {
    return num.toString()
  }
}
export function rgbToHex(rgb: string): `#${string}` {
  const [r, g, b] = rgb.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function resolveParentFolder(path: string) {
  const lastSlash = path.lastIndexOf("/")
  const lastBackslash = path.lastIndexOf("\\")
  const maxIndex = Math.max(lastSlash, lastBackslash)
  if (maxIndex !== -1) return path.slice(0, maxIndex)
  return path
}

/**
 * Identity function with a logging sideeffect used for quickly inspecting values without changing code behaviour
 * @public */
export const $inspect = <T>(args: T, { trace = true, label = "INSPECT" } = {}): T => {
  console[trace ? "trace" : "log"](`🔎 ${label}`, args)
  return args
}

/**
 *
 * @deprecated This should be not be used, as it's buggy. Instead, we should use the type provided by Git
 * TODO: Create a lookup table for object data that maps absolute paths to their details.
 */
export const trimFilenameFromPath = (path: string): string => {
  // If given a directory path, just return it. If given a file path, remove the filename and return the directory path.

  // If it ends with a separator, it's clearly a directory
  const lastSlashIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))
  if (lastSlashIndex === -1) return path
  if (lastSlashIndex === path.length - 1) return path

  // Heuristic: if the last segment contains a dot, treat it as a file; otherwise assume directory
  // TODO: This does not work for .e.g. .github folder
  const basename = path.slice(lastSlashIndex + 1)
  if (basename === "." || basename === ".." || !basename.includes(".")) return path
  return path.slice(0, lastSlashIndex)
}

export function expandIntervalToRange(timestamp: number, commitCountPerTimeIntervalUnit: string): [number, number] {
  const start = new Date(timestamp * 1000)
  start.setUTCHours(0, 0, 0, 0)

  switch (commitCountPerTimeIntervalUnit) {
    case "hour": {
      start.setUTCHours(new Date(timestamp * 1000).getUTCHours(), 0, 0, 0)
      const end = new Date(start)
      end.setUTCHours(end.getUTCHours() + 1)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
    case "day": {
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 1)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
    case "week": {
      const day = start.getUTCDay()
      const diffToMonday = (day + 6) % 7
      start.setUTCDate(start.getUTCDate() - diffToMonday)
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
    case "month": {
      start.setUTCDate(1)
      const end = new Date(start)
      end.setUTCMonth(end.getUTCMonth() + 1)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
    case "year": {
      start.setUTCMonth(0, 1)
      const end = new Date(start)
      end.setUTCFullYear(end.getUTCFullYear() + 1)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
    default: {
      const end = new Date(timestamp * 1000)
      return [Math.floor(start.getTime() / 1000), Math.floor(end.getTime() / 1000)]
    }
  }
}

export const getSep = (path: string) => (path.includes("\\") ? "\\" : "/")

export function iconToURL(icon: string) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='" + icon + "'/></svg>"
  )}")`
}

/**
 * Normalize a path to always use forward slashes and removes trailing slash.
 */
export function normalizePath(p: string): string {
  // Backslashes → forward slashes
  p = p.replace(/\\/g, "/")

  // Collapse multiple slashes
  p = p.replace(/\/+/g, "/")

  // Remove trailing slash unless it's just "/"
  if (p.length <= 1 || !p.endsWith("/")) {
    return p
  }

  const trimmed = p.slice(0, -1)
  const numSegments = p.split("/").length

  // or
  if (numSegments > 2) {
    return trimmed
  }

  return p
}

export function findSubTree(tree: GitTreeObject, path?: string): GitTreeObject {
  if (!path) return tree

  const hasRootPrefix = path === tree.name || path.startsWith(`${tree.name}/`)
  if (!hasRootPrefix) return tree

  let relativePath = path.length === tree.name.length ? "" : path.substring(tree.name.length + 1)
  if (!relativePath) return tree

  relativePath = normalizePath(relativePath)

  let currentTree: GitTreeObject = tree
  const separator = getSep(relativePath)
  const steps = relativePath.split(separator)

  for (let i = 0; i < steps.length; i++) {
    let foundStep = false

    for (const child of currentTree.children) {
      if (child.type === "tree") {
        const childSteps = child.name.split(separator)

        if (childSteps[0] === steps[i]) {
          currentTree = child
          i += childSteps.length - 1
          foundStep = true
          break
        }
      }
    }

    // If a step is not found, abort and return root tree
    if (!foundStep) {
      console.warn(`Could not find step ${steps[i]} in subtree ${currentTree.name}`)
      return tree
    }
  }

  return currentTree
}
