import { describe, expect, it } from "vite-plus/test"
import { normalizePath } from "~/shared/util"

describe("normalizePath", () => {
  it("should replace backslashes with forward slashes", () => {
    const input = "C:\\Users\\bob"
    const output = normalizePath(input)
    expect(output).toBe("C:/Users/bob")
  })

  it("should handle root folder on Mac correctly", () => {
    const input = "/"
    const output = normalizePath(input)
    expect(output).toBe("/")
  })

  it("should handle root folder on Windows correctly", () => {
    const input = "C:/"
    const output = normalizePath(input)
    expect(output).toBe("C:/")
  })
})
