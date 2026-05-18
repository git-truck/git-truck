import { describe, expect, it } from "vitest"
import { millisToUnit, unitToMillis } from "~/shared/utils/time"

describe("unitToMillis", () => {
  it("should convert units to milliseconds correctly", () => {
    const startTime = 0 // Start time in milliseconds
    const units = 2 // Number of units
    const unit = "day" // Time unit

    const result = unitToMillis({ startTimeMillis: startTime, units, unit })
    const expected = 24 * 60 * 60 * 1000 * units

    expect(result).toStrictEqual(expected)
  })
})

describe("millisToUnit", () => {
  it("should convert milliseconds to units correctly", () => {
    const startTime = 0 // Start time in milliseconds
    const millis = 2 * 24 * 60 * 60 * 1000 // Milliseconds to convert
    const unit = "day" // Time unit

    const result = millisToUnit({ startTimeMillis: startTime, millis, unit })
    const expected = 2 // Expected number of units

    expect(result).toStrictEqual(expected)
  })
})
