import { describe, expect, it } from "vitest"
import { countLeafNodes } from "~/metrics/metricUtils"
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
