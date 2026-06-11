import { describe, expect, it } from "vitest"
import { formatCommitRoleCount, getHoveredBarTooltipLines, type HoveredBarTooltip } from "~/state/stores/hovered-object"

function buildTooltip(overrides: Partial<HoveredBarTooltip> = {}): HoveredBarTooltip {
  return {
    label: "January 2024",
    totalCommitCount: 100,
    totalObjectName: "repo",
    clickedObjectName: "file.ts",
    clickedCommitCount: 50,
    contributors: [],
    ...overrides
  }
}

describe("getHoveredBarTooltipLines", () => {
  it("should show total and clicked commit counts", () => {
    expect(getHoveredBarTooltipLines(buildTooltip())).toEqual([
      "January 2024",
      "100 commits to repo",
      "50 commits to file.ts"
    ])
  })

  it("should omit clicked commit counts for the repo root", () => {
    expect(
      getHoveredBarTooltipLines(
        buildTooltip({
          clickedObjectName: null,
          clickedCommitCount: null
        })
      )
    ).toEqual(["January 2024", "100 commits to repo"])
  })
})

describe("formatCommitRoleCount", () => {
  it("should format authored commits", () => {
    expect(formatCommitRoleCount({ authoredCommitCount: 50, coauthoredCommitCount: null })).toBe(
      "(50 authored commits)"
    )
  })

  it("should format authored and co-authored commits", () => {
    expect(formatCommitRoleCount({ authoredCommitCount: 50, coauthoredCommitCount: 10 })).toBe(
      "(50 authored, 10 co-authored commits)"
    )
  })
})
