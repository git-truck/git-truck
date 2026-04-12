import { describe, expect, it } from "vitest"
import { autoBuildContributorGroups } from "~/components/modals/utils/autoBuildContributorGroups"
import type { Person } from "~/shared/model"

describe("autoBuildContributorGroups", () => {
  it("should return empty when fewer than two contributors are provided", () => {
    expect(autoBuildContributorGroups([])).toEqual([])
    expect(autoBuildContributorGroups([{ name: "Alice", email: "alice@example.com" }])).toEqual([])
  })

  it("should group contributors with identical names", () => {
    const contributors: Person[] = [
      { name: "Alice", email: "alice+1@example.com" },
      { name: "Alice", email: "alice+2@example.com" },
      { name: "Bob", email: "bob@example.com" }
    ]

    const groups = autoBuildContributorGroups(contributors)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.members).toHaveLength(2)
    expect(groups[0]?.members.map((m) => m.email)).toEqual(["alice+1@example.com", "alice+2@example.com"])
  })

  it("should group contributors with identical emails", () => {
    const contributors: Person[] = [
      { name: "Alice A", email: "same@example.com" },
      { name: "Alice B", email: "same@example.com" },
      { name: "Charlie", email: "charlie@example.com" }
    ]

    const groups = autoBuildContributorGroups(contributors)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.members).toHaveLength(2)
    expect(groups[0]?.members.map((m) => m.name)).toEqual(["Alice A", "Alice B"])
  })

  it("should not include singleton contributors", () => {
    const contributors: Person[] = [
      { name: "A", email: "a@example.com" },
      { name: "B", email: "b@example.com" },
      { name: "C", email: "c@example.com" }
    ]

    expect(autoBuildContributorGroups(contributors)).toEqual([])
  })
})
