import { describe, expect, it } from "vitest"
import { getSelectedFilePaths } from "~/components/legend/exportSelectedFiles"
import type { MetricCache } from "~/metrics/metrics"
import { MULTIPLE_CONTRIBUTORS } from "~/const"

const categoriesMap: MetricCache["categoriesMap"] = new Map([
  ["repo/src/z.ts", [{ category: "Box Collab", color: "#123456" }]],
  ["repo/src/a.ts", [{ category: "Box Collab", color: "#123456" }]],
  ["repo/src/other.ts", [{ category: "Alice", color: "#654321" }]],
  ["repo/src/tied.ts", [{ category: MULTIPLE_CONTRIBUTORS, color: "#000000" }]]
])

describe("getSelectedFilePaths", () => {
  it("should export sorted repository-relative paths for the selected group", () => {
    expect(getSelectedFilePaths(categoriesMap, ["Box Collab"], "repo")).toEqual(["src/a.ts", "src/z.ts"])
  })

  it("should include all selected categories without duplicating file paths", () => {
    expect(getSelectedFilePaths(categoriesMap, ["Box Collab", "Alice", "Box Collab"], "repo")).toEqual([
      "src/a.ts",
      "src/other.ts",
      "src/z.ts"
    ])
  })

  it("should export nothing when there is no selection or no matching category", () => {
    expect(getSelectedFilePaths(categoriesMap, [], "repo")).toEqual([])
    expect(getSelectedFilePaths(categoriesMap, ["Missing"], "repo")).toEqual([])
  })

  it("should only include multiple-contributor files when that category is selected", () => {
    expect(getSelectedFilePaths(categoriesMap, [MULTIPLE_CONTRIBUTORS], "repo")).toEqual(["src/tied.ts"])
  })

  it("should only include files from the supplied metric cache", () => {
    const folderCache: MetricCache["categoriesMap"] = new Map([["repo/src/a.ts", categoriesMap.get("repo/src/a.ts")!]])

    expect(getSelectedFilePaths(folderCache, ["Box Collab"], "repo")).toEqual(["src/a.ts"])
  })
})
