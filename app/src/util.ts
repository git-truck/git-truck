import { HierarchyRectangularNode } from "d3"
import { HydratedGitBlobObject } from "../../parser/src/model"
import { users } from "./const"

export function unionAuthors(blob: HydratedGitBlobObject) {
  return Object.entries(blob.authors).reduce(
    (newAuthorOject, [author, contributionCount]) => {
      const authors = users.find((x) => x.includes(author))

      const [name] = authors ?? [author]
      delete newAuthorOject[author]
      newAuthorOject[name] = newAuthorOject[name] || 0
      newAuthorOject[name] += contributionCount
      return newAuthorOject
    },
    blob.authors
  )
}

export function diagonal(d: HierarchyRectangularNode<unknown>) {
  const dx = d.x1 - d.x0
  const dy = d.y1 - d.y0

  return Math.sqrt(dx ** 2 + dy ** 2)
}

export function dateFormat(epochTime: number | undefined) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime * 1000).toLocaleString("en-gb", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function dateFormatShort(epochTime: number | undefined) {
  if (!epochTime) return "Invalid date"
  return new Date(epochTime * 1000).toLocaleString("en-gb", {
    dateStyle: "short",
  })
}
