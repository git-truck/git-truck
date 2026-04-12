import type { Person } from "~/shared/model"

type NameScore = {
  startsWithCapital: number
  middleNames: number
  words: number
  length: number
  name: string
}

function scoreName(name: string): NameScore {
  const trimmed = name.trim()
  const words = trimmed.length === 0 ? [] : trimmed.split(/\s+/)
  const middleNames = Math.max(words.length - 2, 0)
  const startsWithCapital = /^\p{Lu}/u.test(trimmed) ? 1 : 0

  return {
    startsWithCapital,
    middleNames,
    words: words.length,
    length: trimmed.length,
    name: trimmed
  }
}

function compareScores(a: NameScore, b: NameScore): number {
  // Higher score should sort first.
  if (a.startsWithCapital !== b.startsWithCapital) return b.startsWithCapital - a.startsWithCapital
  if (a.middleNames !== b.middleNames) return b.middleNames - a.middleNames
  if (a.words !== b.words) return b.words - a.words
  if (a.length !== b.length) return b.length - a.length
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

export function pickContributorGroupDisplayName(members: Person[]): string {
  if (members.length === 0) return "Group"

  const candidates = members
    .map((member) => scoreName(member.name))
    .filter((score) => score.name.length > 0)
    .sort(compareScores)

  return candidates[0]?.name ?? "Group"
}
