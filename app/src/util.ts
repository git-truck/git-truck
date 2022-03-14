import { HierarchyRectangularNode } from "d3"

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
