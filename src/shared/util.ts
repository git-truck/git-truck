import type { HierarchyRectangularNode } from "d3-hierarchy"
import { compare, valid, clean } from "semver"
import colorConvert from "color-convert"
import type { GitObject, GitBlobObject, GitTreeObject, RenameEntry } from "./model"

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
    year: "numeric"
  })
}

export function dateFormatCalendarHeader(epochTime?: number) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime).toLocaleString("en-gb", {
    month: "long",
    year: "numeric"
  })
}

export function dateFormatShort(epochTime: number) {
  return new Date(epochTime).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  })
}

export function dateTimeFormatShort(epochTime: number) {
  return new Date(epochTime).toLocaleString("da-dk", {
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

const brightnessCalculationCache = new Map<`#${string}`, "#000000" | "#ffffff">()

function weightedDistanceIn3D(hex: `#${string}`) {
  const rgb = hexToRgb(hex)
  return Math.sqrt(Math.pow(rgb[0], 2) * 0.241 + Math.pow(rgb[1], 2) * 0.691 + Math.pow(rgb[2], 2) * 0.068)
}

const hexToRgbCache = new Map<`#${string}`, [number, number, number]>()

function hexToRgb(hexString: `#${string}`): [number, number, number] {
  const cachedColor = hexToRgbCache.get(hexString)
  if (cachedColor) {
    return cachedColor
  }
  const rgb = colorConvert.hex.rgb(hexString)
  hexToRgbCache.set(hexString, rgb)
  return rgb
}

export const getTextColorFromBackground = (color: `#${string}`): "#000000" | "#ffffff" => {
  // Verify that the color is a hex color
  if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return "#000000"
  }
  const cachedColor = brightnessCalculationCache.get(color)
  if (cachedColor) {
    return cachedColor
  }

  const brightness = weightedDistanceIn3D(color)
  const foreground = brightness > 186 ? "#000000" : "#ffffff"
  brightnessCalculationCache.set(color, foreground)

  return foreground
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

export function getLightness(hex: `#${string}`): number {
  return weightedDistanceIn3D(hex) / 255
}

export const isTree = (d: GitObject | null = null): d is GitTreeObject => d?.type === "tree"
export const isBlob = (d: GitObject | null = null): d is GitBlobObject => d?.type === "blob"

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
export function getWeek(date: Date): number {
  const tempDate = new Date(date)
  tempDate.setHours(0, 0, 0, 0)
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7))
  const yearStart = new Date(tempDate.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return weekNo
}
export function getTimeIntervals(timeUnit: string, minTime: number, maxTime: number): [string, number][] {
  const intervals: [string, number][] = []

  const startDate = new Date(minTime * 1000)
  const endDate = new Date(maxTime * 1000)

  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const currTime = currentDate.getTime() / 1000
    if (timeUnit === "week") {
      const weekNum = getWeek(currentDate)
      intervals.push([`Week ${weekNum < 10 ? "0" : ""}${weekNum} ${currentDate.getFullYear()}`, currTime])
      currentDate.setDate(currentDate.getDate() + 7)
    } else if (timeUnit === "year") {
      intervals.push([currentDate.getFullYear().toString(), currTime])
      currentDate.setFullYear(currentDate.getFullYear() + 1)
    } else if (timeUnit === "month") {
      intervals.push([currentDate.toLocaleString("en-gb", { month: "long", year: "numeric" }), currTime])
      currentDate.setMonth(currentDate.getMonth() + 1)
    } else if (timeUnit === "day") {
      intervals.push([
        currentDate
          .toLocaleDateString("en-gb", { day: "numeric", month: "long", year: "numeric", weekday: "short" })
          .replace(",", ""),
        currTime
      ])
      currentDate.setDate(currentDate.getDate() + 1)
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

export function lookupFileInTree(tree: GitTreeObject, path: string): GitObject | undefined {
  const dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find((x) => x.name === file && x.type === "blob")
    if (!result) return
    return result
  }
  const subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return lookupFileInTree(subtree, dirs.slice(1).join("/"))
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
 * @param promise An async function
 * @returns A tuple of the result and an error. If there is no error, the error will be null.
 */

export async function promiseHelper<T>(promise: Promise<T>): Promise<[null, Error] | [T, null]> {
  try {
    return [await promise, null]
  } catch (e) {
    return [null, e as Error]
  }
}

export function isValidURI(uri: string) {
  try {
    decodeURIComponent(uri)
    return true
  } catch (error) {
    return false
  }
}
