import { dateFormatShort, rgbToHex } from "~/shared/util"
import { interpolateCool, scaleOrdinal, scaleSequential } from "d3"

interface lastChangedGroup {
  epoch: number
  color: `#${string}`
  text: string
}

export function lastChangedGroupings(newestEpoch: number, oldestChangeDate: number): lastChangedGroup[] {
  const scale = scaleSequential(interpolateCool)
  // , [oldestChangeDate, newestEpoch])

  return [
    { epoch: 31556926 * 4, text: ">4y" },
    { epoch: 31556926 * 2, text: ">2y" },
    { epoch: 31556926, text: ">1y" },
    { epoch: 2629743, text: ">1m" },
    { epoch: 604800, text: ">1w" },
    { epoch: 86400, text: ">1d" },
    { epoch: 0, text: dateFormatShort(newestEpoch * 1000) }
  ].map((group, i, arr) => ({ ...group, color: rgbToHex(interpolateCool(i / arr.length)) as `#${string}` }))

  return [
    {
      epoch: 0,
      text: dateFormatShort(newestEpoch * 1000, {
        day: undefined
      }),
      color: "#cff2ff"
    },
    { epoch: 86400, text: ">1d", color: "#c6dbef" },
    { epoch: 604800, text: ">1w", color: "#9ecae1" },
    { epoch: 2629743, text: ">1m", color: "#6baed6" },
    { epoch: 31556926, text: ">1y", color: "#4292c6" },
    { epoch: 31556926 * 2, text: ">2y", color: "#2171b5" },
    { epoch: 31556926 * 4, text: ">4y", color: "#084594" }
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
