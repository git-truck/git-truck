import { HierarchyRectangularNode } from "d3"

export function diagonal(d: HierarchyRectangularNode<unknown>) {
  const dx = d.x1 - d.x0
  const dy = d.y1 - d.y0

  return Math.sqrt(dx ** 2 + dy ** 2)
}

const format = navigator.language

export function dateFormatLong(epochTime: number | undefined) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime * 1000).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function dateFormatShort(epochTime: number | undefined) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime * 1000).toLocaleString(format, {
    dateStyle: "short",
  })
}
