import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { GitService } from "~/server/git-service"

let root: string
const paths = {
  plain: "",
  repository: "",
  worktree: "",
  bareRoot: "",
  bareWorktree: "",
  bareFolder: ""
}

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "git-truck-git-service-"))
  paths.plain = join(root, "plain")
  paths.repository = join(root, "repository")
  paths.worktree = join(root, "worktree")
  paths.bareRoot = join(root, "bare-root")
  paths.bareWorktree = join(paths.bareRoot, "feature")
  paths.bareFolder = join(root, "folder.git")

  mkdirSync(paths.plain)
  mkdirSync(paths.repository)
  git(paths.repository, "init", "-q", "-b", "main")
  git(paths.repository, "config", "user.name", "Test")
  git(paths.repository, "config", "user.email", "test@example.com")
  writeFileSync(join(paths.repository, "file.txt"), "hello\n")
  git(paths.repository, "add", ".")
  git(paths.repository, "commit", "-q", "-m", "initial")
  git(paths.repository, "worktree", "add", "-q", "-b", "feature", paths.worktree)
  // A file named like the branch must not make the ref ambiguous
  writeFileSync(join(paths.worktree, "feature"), "not a ref\n")

  // Bare repository with a `.bare` folder and a `.git` file, worktrees as subfolders
  mkdirSync(paths.bareRoot)
  git(root, "clone", "-q", "--bare", paths.repository, join(paths.bareRoot, ".bare"))
  writeFileSync(join(paths.bareRoot, ".git"), "gitdir: ./.bare\n")
  git(paths.bareRoot, "worktree", "add", "-q", paths.bareWorktree, "main")

  git(root, "clone", "-q", "--bare", paths.repository, paths.bareFolder)
  // Pack refs so last changed has to read them from the common directory or fall back to git
  git(paths.bareRoot, "pack-refs", "--all")
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe("GitService.resolveGitLocation", () => {
  it("should detect a repository with a .git folder", () => {
    expect(GitService.resolveGitLocation(paths.repository)).toMatchObject({
      kind: "repository",
      gitDir: join(paths.repository, ".git"),
      commonDir: join(paths.repository, ".git")
    })
  })

  it("should detect a worktree and its common directory", () => {
    expect(GitService.resolveGitLocation(paths.worktree)).toMatchObject({
      kind: "worktree",
      commonDir: join(paths.repository, ".git")
    })
  })

  it("should detect a bare repository behind a .git file", () => {
    expect(GitService.resolveGitLocation(paths.bareRoot).kind).toBe("bare")
  })

  it("should detect a worktree of a bare repository as a worktree", () => {
    expect(GitService.resolveGitLocation(paths.bareWorktree)).toMatchObject({
      kind: "worktree",
      commonDir: join(paths.bareRoot, ".bare")
    })
  })

  it("should detect a bare repository folder", () => {
    expect(GitService.resolveGitLocation(paths.bareFolder).kind).toBe("bare")
  })

  it("should return none for a plain folder", () => {
    expect(GitService.resolveGitLocation(paths.plain).kind).toBe("none")
  })
})

describe("GitService.isValidGitRepo", () => {
  it("should accept repositories and worktrees", async () => {
    expect(await GitService.isValidGitRepo(paths.repository)).toBe(true)
    expect(await GitService.isValidGitRepo(paths.worktree)).toBe(true)
    expect(await GitService.isValidGitRepo(paths.bareWorktree)).toBe(true)
  })

  it("should reject bare repositories and plain folders", async () => {
    expect(await GitService.isValidGitRepo(paths.bareRoot)).toBe(false)
    expect(await GitService.isValidGitRepo(paths.bareFolder)).toBe(false)
    expect(await GitService.isValidGitRepo(paths.plain)).toBe(false)
  })
})

describe("GitService._getRepositoryHead", () => {
  it("should read the worktree's own HEAD", async () => {
    expect(await GitService._getRepositoryHead(paths.repository)).toBe("main")
    expect(await GitService._getRepositoryHead(paths.worktree)).toBe("feature")
    expect(await GitService._getRepositoryHead(paths.bareWorktree)).toBe("main")
  })
})

describe("GitService.getCommitHashOfBranchHead", () => {
  it("should resolve the head commit of a worktree", async () => {
    const expected = git(paths.repository, "rev-parse", "HEAD")
    expect(await GitService.getCommitHashOfBranchHead({ repositoryPath: paths.worktree })).toBe(expected)
    expect(await GitService.getCommitHashOfBranchHead({ repositoryPath: paths.bareWorktree })).toBe(expected)
  })
})

describe("GitService.getLastChanged", () => {
  it("should return the head commit time for worktrees", async () => {
    const expected = Number(git(paths.repository, "log", "-1", "--format=%at"))
    expect(await GitService.getLastChanged(paths.worktree)).toBe(expected)
    expect(await GitService.getLastChanged(paths.bareWorktree)).toBe(expected)
  })
})

describe("GitService.getRepoMetadata", () => {
  it("should list branches shared with the main repository for a worktree", async () => {
    const metadata = await GitService.getRepoMetadata(paths.worktree)
    expect(metadata?.status).toBe("Success")
    expect(metadata?.status === "Success" ? Object.keys(metadata.refs.Branches).sort() : []).toEqual([
      "feature",
      "main"
    ])
  })
})
