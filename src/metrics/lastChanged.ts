import { dateFormatShort } from "~/util"

interface lastChangedGroup {
  epoch: number
  color: `#${string}`
  text: string
}

export function lastChangedGroupings(newestEpoch: number): lastChangedGroup[] {
  return [
    { epoch: 0, text: dateFormatShort(newestEpoch * 1000), color: "#cff2ff" },
    { epoch: 86400, text: "+1d", color: "#c6dbef" },
    { epoch: 604800, text: "+1w", color: "#9ecae1" },
    { epoch: 2629743, text: "+1m", color: "#6baed6" },
    { epoch: 31556926, text: "+1y", color: "#4292c6" },
    { epoch: 31556926 * 2, text: "+2y", color: "#2171b5" },
    { epoch: 31556926 * 4, text: "+4y", color: "#084594" }
  ]
}

export function getLastChangedIndex(groupings: lastChangedGroup[], newest: number, input: number) {
  const diff = newest - input
  let index = 0
  while (index < groupings.length - 1) {
    if (diff < groupings[index + 1].epoch) return index
    else index++
  }
  return index
}
