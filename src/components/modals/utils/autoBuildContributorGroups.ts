import type { Person, ContributorGroup } from "~/shared/model"
import { pickContributorGroupDisplayName } from "~/components/modals/utils/displayNameStrategy"

// Extract the numeric account id from GitHub noreply emails like: 123456-username@users.noreply.github.com
const getGithubNoreplyId = (email: string): string | null => {
  const match = email.match(/^(\d+)-[^@]+@users\.noreply\.github\.com$/i)
  return match?.[1] ?? null
}

export function autoBuildContributorGroups(ungroupedContributors: Person[]): ContributorGroup[] {
  if (ungroupedContributors.length < 2) return []

  // Union-Find setup: each contributor starts in its own set.
  const parent = Array.from({ length: ungroupedContributors.length }, (_, i) => i)
  const rank = Array(ungroupedContributors.length).fill(0)

  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i])
    return parent[i]
  }

  const union = (a: number, b: number) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA === rootB) return
    if (rank[rootA] < rank[rootB]) parent[rootA] = rootB
    else if (rank[rootA] > rank[rootB]) parent[rootB] = rootA
    else {
      parent[rootB] = rootA
      rank[rootA]++
    }
  }

  const firstByName = new Map<string, number>()
  const firstByEmail = new Map<string, number>()
  const firstByGithubNoreplyId = new Map<string, number>()

  // Matching is transitive: if A matches B and B matches C, all become one group.
  for (const [i, { name, email }] of ungroupedContributors.entries()) {
    if (name) {
      if (firstByName.has(name)) union(i, firstByName.get(name)!)
      else firstByName.set(name, i)
    }
    if (email) {
      if (firstByEmail.has(email)) union(i, firstByEmail.get(email)!)
      else firstByEmail.set(email, i)

      const githubNoreplyId = getGithubNoreplyId(email)
      if (githubNoreplyId) {
        if (firstByGithubNoreplyId.has(githubNoreplyId)) union(i, firstByGithubNoreplyId.get(githubNoreplyId)!)
        else firstByGithubNoreplyId.set(githubNoreplyId, i)
      }
    }
  }

  const groupsByRoot = new Map<number, Person[]>()
  for (const [i, person] of ungroupedContributors.entries()) {
    const root = find(i)
    const group = groupsByRoot.get(root) ?? []
    group.push(person)
    groupsByRoot.set(root, group)
  }

  return Array.from(groupsByRoot.values())
    .filter((g) => g.length > 1)
    .map((members) => ({
      displayName: pickContributorGroupDisplayName(members),
      members
    }))
}
