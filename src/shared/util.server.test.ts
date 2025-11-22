import { describe, expect, it } from "vitest"
import path from "node:path"
import { getBaseDirFromPath, getRepoNameFromPath, parseArgs, getArgsWithDefaults } from "./util.server"

describe("shared util path helpers", () => {
  const repoPath = path.resolve("/tmp/my/base/repo")

  it("getBaseDirFromPath returns parent directory of repository path", () => {
    const base = getBaseDirFromPath(repoPath)
    expect(base).toBe("/tmp/my/base")
  })

  it("getRepoNameFromPath returns repository folder name", () => {
    const name = getRepoNameFromPath(repoPath)
    expect(name).toBe("repo")
  })
})

describe("argument parsing helpers", () => {
  it("parseArgs parses a provided args array", () => {
    const parsed = parseArgs(["--path", "some/repo", "--flag", "value", "positional"])
    expect(parsed.path).toBe("some/repo")
    expect(parsed.flag).toBe("value")
    expect(Array.isArray(parsed._)).toBe(true)
    expect(parsed._[0]).toBe("positional")
  })

  it("getArgsWithDefaults falls back to default path when argv is empty", () => {
    const originalArgv = process.argv
    try {
      // simulate invocation with no extra args
      process.argv = [process.argv[0], process.argv[1]]
      const args = getArgsWithDefaults()
      expect(args.path).toBe(".")
    } finally {
      process.argv = originalArgv
    }
  })
})
