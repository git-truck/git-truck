import type { Person } from "./model"

export function getCoAuthors(description: string) {
  const coauthorRegex = /Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  const coauthormatches = description.matchAll(coauthorRegex)
  let next = coauthormatches.next()
  const coauthors: Person[] = []

  while (next.value !== undefined) {
    coauthors.push({
      name: next.value.groups["name"].trimEnd(),
      email: next.value.groups["email"]
    })
    next = coauthormatches.next()
  }
  return coauthors
}
