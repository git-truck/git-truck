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

function getWeek(date: Date): number {
  const tempDate = new Date(date)
  tempDate.setHours(0, 0, 0, 0)
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7))
  const yearStart = new Date(tempDate.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return weekNo
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
