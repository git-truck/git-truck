import { describe, expect, it } from "vitest"
import {
  formatLastChangedSummary,
  formatMetricCount,
  formatTopContributorSummary
} from "~/components/inspection/MetricsInspection"

describe("formatTopContributorSummary", () => {
  it("should show loading while metric data is unavailable", () => {
    expect(formatTopContributorSummary(null)).toBe("loading...")
  })

  it("should show multiple people for tied top contributors", () => {
    expect(
      formatTopContributorSummary({
        multiTopContributors: true,
        topContributor: [
          { contributor: "Bob", contribs: 12 },
          { contributor: "Marley", contribs: 12 }
        ]
      })
    ).toBe("Multiple people")
  })

  it("should show no contributors when the distribution is empty", () => {
    expect(formatTopContributorSummary({ multiTopContributors: false, topContributor: [] })).toBe("No contributors")
  })

  it("should show the top contributor name", () => {
    expect(
      formatTopContributorSummary({
        multiTopContributors: false,
        topContributor: [{ contributor: "Bob", contribs: 12 }]
      })
    ).toBe("Bob")
  })
})

describe("formatLastChangedSummary", () => {
  it("should show loading while metric data is unavailable", () => {
    expect(formatLastChangedSummary(undefined, false)).toBe("loading...")
  })

  it("should show no activity when loaded metric data has no timestamp", () => {
    expect(formatLastChangedSummary(undefined, true)).toBe("No activity")
    expect(formatLastChangedSummary(0, true)).toBe("No activity")
  })
})

describe("formatMetricCount", () => {
  it("should preserve zero values", () => {
    expect(formatMetricCount(0)).toBe("0")
  })

  it("should show loading for unavailable values", () => {
    expect(formatMetricCount(undefined)).toBe("loading...")
  })
})
