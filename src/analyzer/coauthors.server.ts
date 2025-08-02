import type { Person } from "../shared/model"

export function getCoAuthors(description: string) {
  const coauthorRegex = /Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  const coauthormatches = description.matchAll(coauthorRegex)
  let value = coauthormatches.next().value
  const coauthors: Person[] = []

  while (value !== undefined) {
    coauthors.push({
       
      name: value.groups!["name"].trimEnd(),
       
      email: value.groups!["email"]
    })
    value = coauthormatches.next().value
  }
  return coauthors
}
