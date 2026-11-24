import { describe, expect, it } from "vitest"
import { countLeafNodes, generateContributorColors } from "~/metrics/metricUtils"
import type { GitBlobObject, GitTreeObject } from "~/shared/model"

const tree = {
  type: "tree",
  children: [{ type: "blob" } as GitBlobObject, { type: "blob" } as GitBlobObject]
} as GitTreeObject

describe("countLeafNodes", () => {
  it("can count properly", () => {
    expect(countLeafNodes(tree)).toBe(2)
  })
})

describe("generateContributorColors", () => {
  const contributors = [
    { name: "Jonas R\u00f8ssum", email: "jonas@example.com" },
    { name: "Alice", email: "alice@example.com" }
  ]
  const groups = [{ displayName: "Box Collab", members: contributors }]

  it("should apply a saved custom color to a group name that is not a Git author", () => {
    const colors = generateContributorColors(contributors, "seed", { "Box Collab": "#123456" }, groups)

    expect(colors["Box Collab"]).toBe("#123456")
  })

  it("should generate a default group color without changing existing author colors", () => {
    const authorColors = generateContributorColors(contributors, "seed", {}, [])
    const colors = generateContributorColors(contributors, "seed", {}, groups)

    expect(colors["Box Collab"]).toMatch(/^#[0-9a-f]{6}$/i)
    for (const contributor of contributors) {
      expect(colors[contributor.name]).toBe(authorColors[contributor.name])
    }
  })

  it("should restore the generated color after removing the group override", () => {
    const defaultColors = generateContributorColors(contributors, "seed", {}, groups)
    const customColors = generateContributorColors(contributors, "seed", { "Box Collab": "#123456" }, groups)
    const resetColors = generateContributorColors(contributors, "seed", {}, groups)

    expect(customColors["Box Collab"]).toBe("#123456")
    expect(resetColors["Box Collab"]).toBe(defaultColors["Box Collab"])
  })

  it("should not reassign a color when a group uses an existing author name", () => {
    const authorColors = generateContributorColors(contributors, "seed", {}, [])
    const colors = generateContributorColors(contributors, "seed", {}, [
      { displayName: "Alice", members: contributors }
    ])

    expect(colors).toEqual(authorColors)
  })

  it("should generate the same colors regardless of group ordering", () => {
    const multipleGroups = [...groups, { displayName: "Other team", members: [] }]

    expect(generateContributorColors(contributors, "seed", {}, multipleGroups)).toEqual(
      generateContributorColors(contributors, "seed", {}, multipleGroups.toReversed())
    )
  })
})
