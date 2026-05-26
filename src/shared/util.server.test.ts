import { describe, expect, it } from "vitest"
import path from "node:path"
import { getBaseDirFromPath, getRepoNameFromPath } from "~/shared/util.server"
import { parseArgsWithDefaults } from "./utils/args"

describe("getBaseDirFromPath", () => {
  it("should return parent directory of repository path", () => {
    if (process.platform === "win32") {
      const repoPath = "C:\\Users\\user\\git\\repo"
      const base = getBaseDirFromPath(repoPath)
      expect(base).toBe("C:/Users/user/git")
    } else {
      const repoPath = "/tmp/my/base/repo"
      const base = getBaseDirFromPath(repoPath)
      expect(base).toBe("/tmp/my/base")
    }
  })
})

describe("getRepoNameFromPath", () => {
  it("should return repository folder name", () => {
    const name = getRepoNameFromPath("path/to/repo")
    expect(name).toBe("repo")
  })

  it("should handle root paths correctly", () => {
    if (process.platform === "win32") {
      const rootPath = path.resolve("C:/")
      expect(getRepoNameFromPath("C:/")).toBe(rootPath)
    } else {
      expect(getRepoNameFromPath("/")).toBe("/")
    }
  })
})

describe("parseArgs", () => {
  it("should parse a provided args array", () => {
    const parsed = parseArgsWithDefaults(["--headless", "--log", "value", "some/repo"])
    expect(parsed.headless).toBe(true)
    expect(parsed.log).toBe("value")
    expect(parsed.path).toBe("some/repo")
  })
})

describe("getArgsWithDefaults", () => {
  it("should fall back to default path when argv is empty", () => {
    const originalArgv = process.argv
    try {
      // simulate invocation with no extra args
      process.argv = [process.argv[0], process.argv[1]]
      const args = parseArgsWithDefaults()
      expect(args.path).toBe(process.cwd())
    } finally {
      process.argv = originalArgv
    }
  })
})
