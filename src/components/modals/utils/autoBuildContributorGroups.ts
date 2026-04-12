import type { Person, ContributorGroup } from "~/shared/model"

export function autoBuildContributorGroups(ungroupedContributors: Person[]): ContributorGroup[] {
  if (ungroupedContributors.length < 2) return []

  const stringSorter = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase())
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

  for (const [i, { name, email }] of ungroupedContributors.entries()) {
    if (name) {
      if (firstByName.has(name)) union(i, firstByName.get(name)!)
      else firstByName.set(name, i)
    }
    if (email) {
      if (firstByEmail.has(email)) union(i, firstByEmail.get(email)!)
      else firstByEmail.set(email, i)
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
    .map((members) => {
      const sorted = [...members].sort(
        (a, b) => stringSorter(a.name, b.name) || stringSorter(a.email ?? "", b.email ?? "")
      )
      return { displayName: sorted[0]?.name ?? "Group", members: sorted }
    })
}
