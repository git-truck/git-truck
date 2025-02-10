import type { Person } from "./model"

export function getCoAuthors(description: string) {
  const coauthorRegex = /Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  const coauthormatches = description.matchAll(coauthorRegex)
  let value = coauthormatches.next().value
  const coauthors: Person[] = []

  while (value !== undefined) {
    coauthors.push({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know that the groups are defined
      name: value.groups!["name"].trimEnd(),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know that the groups
      email: value.groups!["email"]
    })
    value = coauthormatches.next().value
  }
  return coauthors
}
