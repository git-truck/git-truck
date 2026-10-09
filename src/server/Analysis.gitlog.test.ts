import { describe, expect, it } from "vitest"
import { Analysis } from "~/server/Analysis"
import type DB from "~/server/DB"
import type { GitService } from "~/server/git-service"
import type { GitLogEntry, RenameEntry } from "~/shared/model"

function createAnalysis() {
  return new Analysis({
    db: {} as DB,
    gitService: {} as GitService,
    repositoryPath: "repo",
    branch: "main"
  })
}

function simpleHeader({
  parents = "",
  author = "Alice",
  email = "alice@example.com",
  committerTime = 1696867200,
  authorTime = 1696867100,
  trailers = "",
  hash
}: {
  parents?: string
  author?: string
  email?: string
  committerTime?: number
  authorTime?: number
  trailers?: string
  hash: string
}) {
  return `"<|${parents}|><|${author}|><|${email}|><|${committerTime} ${authorTime}|><|${trailers}|><|${hash}|>"`
}

function fullHeader({
  parents = "",
  author = "Alice",
  email = "alice@example.com",
  committerTime = 1696867200,
  authorTime = 1696867100,
  message = "",
  body = "",
  hash
}: {
  parents?: string
  author?: string
  email?: string
  committerTime?: number
  authorTime?: number
  message?: string
  body?: string
  hash: string
}) {
  return `"parents <|${parents}|> author <|${author}|> email <|${email}|> date <|${committerTime} ${authorTime}|> message <|${message}|> body <|${body}|> hash <|${hash}|>"`
}

describe("gatherCommitsFromGitLog", () => {
  it("should parse a normal commit with numstat lines", async () => {
    const analysis = createAnalysis()
    const log = [simpleHeader({ hash: "a".repeat(40) }), "3\t1\tsrc/file1.ts", "0\t5\tsrc/file2.ts"].join("\n")

    const commits = new Map<string, GitLogEntry>()
    const renamedFiles: RenameEntry[] = []
    await analysis.gatherCommitsFromGitLog(log, commits, renamedFiles)

    const commit = commits.get("a".repeat(40))
    expect(commit).toBeDefined()
    expect(commit?.fileChanges).toEqual([
      { isBinary: false, insertions: 3, deletions: 1, path: "repo/src/file1.ts", mode: "modify" },
      { isBinary: false, insertions: 0, deletions: 5, path: "repo/src/file2.ts", mode: "modify" }
    ])
  })

  it("should parse merge commits with multiple parents", async () => {
    const analysis = createAnalysis()
    const parentA = "b".repeat(40)
    const parentB = "c".repeat(40)
    const hash = "d".repeat(40)
    const log = [simpleHeader({ parents: `${parentA} ${parentB}`, hash }), "2\t0\tsrc/merged.ts"].join("\n")

    const commits = new Map<string, GitLogEntry>()
    await analysis.gatherCommitsFromGitLog(log, commits, [])

    const commit = commits.get(hash)
    expect(commit?.parentHash).toBe(parentA)
    expect(commit?.secondaryParentHash).toBe(parentB)
  })

  it("should parse trailers/co-authors", async () => {
    const analysis = createAnalysis()
    const hash = "e".repeat(40)
    const log = [
      simpleHeader({ trailers: "Co-authored-by: Bob Bobby <bob@example.com>", hash }),
      "1\t1\tsrc/file.ts"
    ].join("\n")

    const commits = new Map<string, GitLogEntry>()
    await analysis.gatherCommitsFromGitLog(log, commits, [])

    const commit = commits.get(hash)
    expect(commit?.coauthors).toEqual([{ name: "Bob Bobby", email: "bob@example.com" }])
  })

  it("should parse binary files", async () => {
    const analysis = createAnalysis()
    const hash = "f".repeat(40)
    const log = [simpleHeader({ hash }), "-\t-\tassets/image.png"].join("\n")

    const commits = new Map<string, GitLogEntry>()
    await analysis.gatherCommitsFromGitLog(log, commits, [])

    const commit = commits.get(hash)
    expect(commit?.fileChanges).toEqual([
      { isBinary: true, insertions: 1, deletions: 0, path: "repo/assets/image.png", mode: "modify" }
    ])
  })

  it("should parse create/delete mode summary lines", async () => {
    const analysis = createAnalysis()
    const hash = "1".repeat(40)
    const log = [
      simpleHeader({ hash }),
      "1\t0\tsrc/newfile.ts",
      " create mode 100644 src/newfile.ts",
      " delete mode 100644 src/oldfile.ts"
    ].join("\n")

    const commits = new Map<string, GitLogEntry>()
    const renamedFiles: RenameEntry[] = []
    await analysis.gatherCommitsFromGitLog(log, commits, renamedFiles)

    expect(renamedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromName: null, toName: "src/newfile.ts" }),
        expect.objectContaining({ fromName: "src/oldfile.ts", toName: null })
      ])
    )
  })

  it("should parse renamed files", async () => {
    const analysis = createAnalysis()
    const hash = "2".repeat(40)
    const log = [simpleHeader({ hash }), "0\t0\tsrc/{old.ts => new.ts}"].join("\n")

    const commits = new Map<string, GitLogEntry>()
    const renamedFiles: RenameEntry[] = []
    await analysis.gatherCommitsFromGitLog(log, commits, renamedFiles)

    const commit = commits.get(hash)
    expect(commit?.fileChanges[0].path).toBe("repo/repo/src/new.ts")
  })

  it("should parse multiple commits in a single log", async () => {
    const analysis = createAnalysis()
    const hashA = "3".repeat(40)
    const hashB = "4".repeat(40)
    const log = [
      simpleHeader({ hash: hashA }),
      "1\t0\tsrc/a.ts",
      simpleHeader({ parents: hashA, hash: hashB }),
      "0\t1\tsrc/b.ts"
    ].join("\n")

    const commits = new Map<string, GitLogEntry>()
    await analysis.gatherCommitsFromGitLog(log, commits, [])

    expect(commits.size).toBe(2)
    expect(commits.get(hashA)?.fileChanges[0].path).toBe("repo/src/a.ts")
    expect(commits.get(hashB)?.fileChanges[0].path).toBe("repo/src/b.ts")
    expect(commits.get(hashB)?.parentHash).toBe(hashA)
  })

  it("should not throw RangeError for commits with thousands of changed files", async () => {
    const analysis = createAnalysis()
    const hashA = "5".repeat(40)
    const hashB = "6".repeat(40)
    const fileCount = 20_000

    const numstatLinesA = Array.from({ length: fileCount }, (_, i) => `1\t1\tsrc/file-a-${i}.ts`)
    const numstatLinesB = Array.from({ length: fileCount }, (_, i) => `-\t-\tassets/binary-b-${i}.png`)

    const log = [
      simpleHeader({ hash: hashA }),
      ...numstatLinesA,
      simpleHeader({ parents: hashA, hash: hashB }),
      ...numstatLinesB
    ].join("\n")

    const commits = new Map<string, GitLogEntry>()
    await expect(analysis.gatherCommitsFromGitLog(log, commits, [])).resolves.not.toThrow()

    expect(commits.size).toBe(2)
    expect(commits.get(hashA)?.fileChanges.length).toBe(fileCount)
    expect(commits.get(hashB)?.fileChanges.length).toBe(fileCount)
  })
})

describe("getFullCommits", () => {
  it("should parse multiline commit messages and bodies", async () => {
    const analysis = createAnalysis()
    const hash = "7".repeat(40)
    const log = [
      fullHeader({
        hash,
        message: "Short summary",
        body: "Line one of body\nLine two of body\n\nCo-authored-by: Bob Bobby <bob@example.com>"
      }),
      "2\t3\tsrc/file.ts"
    ].join("\n")

    const commits = await analysis.getFullCommits(log)

    expect(commits).toHaveLength(1)
    expect(commits[0].message).toBe("Short summary")
    expect(commits[0].body).toBe("Line one of body\nLine two of body\n\nCo-authored-by: Bob Bobby <bob@example.com>")
    expect(commits[0].coauthors).toEqual([{ name: "Bob Bobby", email: "bob@example.com" }])
    expect(commits[0].fileChanges).toEqual([
      { isBinary: false, insertions: 2, deletions: 3, path: "src/file.ts", mode: "modify" }
    ])
  })

  it("should not throw RangeError for multiple commits with thousands of changed files", async () => {
    const analysis = createAnalysis()
    const hashA = "8".repeat(40)
    const hashB = "9".repeat(40)
    const fileCount = 20_000

    const numstatLinesA = Array.from({ length: fileCount }, (_, i) => `1\t1\tsrc/file-a-${i}.ts`)
    const numstatLinesB = Array.from({ length: fileCount }, (_, i) => `-\t-\tassets/binary-b-${i}.png`)

    const log = [
      fullHeader({ hash: hashA, message: "first", body: "" }),
      ...numstatLinesA,
      fullHeader({ parents: hashA, hash: hashB, message: "second", body: "" }),
      ...numstatLinesB
    ].join("\n")

    const commits = await analysis.getFullCommits(log)

    expect(commits).toHaveLength(2)
    expect(commits[0].fileChanges.length).toBe(fileCount)
    expect(commits[1].fileChanges.length).toBe(fileCount)
  })
})
