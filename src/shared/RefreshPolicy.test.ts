import { describe, expect, it } from "vitest"
import { getLoaderInvocationReason } from "~/shared/RefreshPolicy"

describe("getLoaderInvocationReason", () => {
  it("should preserve pending action reasons when the time range is unchanged", () => {
    expect(getLoaderInvocationReason("groupedContributors", null)).toBe("groupedContributors")
    expect(getLoaderInvocationReason("rerollColors", null)).toBe("rerollColors")
  })

  it("should return none for neutral reasons when the time range is unchanged", () => {
    expect(getLoaderInvocationReason("unknown", null)).toBe("none")
    expect(getLoaderInvocationReason("none", null)).toBe("none")
  })

  it("should use the time range reason when the time range changes", () => {
    expect(getLoaderInvocationReason("none", "timeseriesstart")).toBe("timeseriesstart")
    expect(getLoaderInvocationReason("rerollColors", "timeseriesend")).toBe("timeseriesend")
  })
})
