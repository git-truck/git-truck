import { describe, expect, it } from "vitest"
import { contribRegex, gitLogRegex, gitLogRegexSimple, modeRegex } from "~/shared/constants"

describe("gitLogRegexSimple", () => {
  it("should match only the header, not the numstat/summary lines", () => {
    const hash = "a".repeat(40)
    const log = [
      `"<|<|><|Alice|><|alice@example.com|><|1696867200 1696867100|><||><|${hash}|>"`,
      "3\t1\tsrc/file1.ts",
      " create mode 100644 src/file1.ts"
    ].join("\n")

    const matches = [...log.matchAll(gitLogRegexSimple)]
    expect(matches).toHaveLength(1)
    expect(matches[0].groups?.hash).toBe(hash)
    // The match must end at the closing quote of the header, not consume the
    // numstat/summary lines that follow.
    expect(log.slice(matches[0].index, matches[0].index! + matches[0][0].length)).toMatch(/"$/)
  })

  it("should support multiline trailers", () => {
    const hash = "b".repeat(40)
    const trailers = "Co-authored-by: Bob <bob@example.com>\nCo-authored-by: Carol <carol@example.com>"
    const log = `"<|<|><|Alice|><|alice@example.com|><|1696867200 1696867100|><|${trailers}|><|${hash}|>"`

    const matches = [...log.matchAll(gitLogRegexSimple)]
    expect(matches).toHaveLength(1)
    expect(matches[0].groups?.trailers).toBe(trailers)
  })
})

describe("gitLogRegex", () => {
  it("should support multiline messages and bodies without consuming numstat lines", () => {
    const hash = "c".repeat(40)
    const log = [
      `"parents <|<|> author <|Alice|> email <|alice@example.com|> date <|1696867200 1696867100|> message <|Summary line|> body <|Line one\nLine two|> hash <|${hash}|>"`,
      "2\t3\tsrc/file.ts"
    ].join("\n")

    const matches = [...log.matchAll(gitLogRegex)]
    expect(matches).toHaveLength(1)
    expect(matches[0].groups?.message).toBe("Summary line")
    expect(matches[0].groups?.body).toBe("Line one\nLine two")
    expect(matches[0].groups?.hash).toBe(hash)
  })
})

describe("contribRegex", () => {
  it("should parse numstat lines, including binary markers", () => {
    const section = "3\t1\tsrc/file1.ts\n-\t-\tassets/image.png"
    const matches = [...section.matchAll(contribRegex)]
    expect(matches.map((m) => m.groups)).toEqual([
      { insertions: "3", deletions: "1", file: "src/file1.ts" },
      { insertions: "-", deletions: "-", file: "assets/image.png" }
    ])
  })

  it("should not match create/delete mode summary lines", () => {
    const section = " create mode 100644 src/file1.ts\n delete mode 100644 src/file2.ts"
    const matches = [...section.matchAll(contribRegex)]
    expect(matches).toHaveLength(0)
  })
})

describe("modeRegex", () => {
  it("should parse create/delete mode summary lines", () => {
    const section = " create mode 100644 src/file1.ts\n delete mode 100644 src/file2.ts"
    const matches = [...section.matchAll(modeRegex)]
    expect(matches.map((m) => ({ mode: m.groups?.mode, file: m.groups?.file }))).toEqual([
      { mode: "create", file: "src/file1.ts" },
      { mode: "delete", file: "src/file2.ts" }
    ])
  })

  it("should not match ordinary numstat lines", () => {
    const section = "3\t1\tsrc/file1.ts"
    const matches = [...section.matchAll(modeRegex)]
    expect(matches).toHaveLength(0)
  })
})
