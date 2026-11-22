import { DuckDBInstance } from "@duckdb/node-api"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Analysis } from "~/server/Analysis"
import DB from "~/server/DB"
import { GitService } from "~/server/git-service"
import MetadataDB from "~/server/MetadataDB"

const directories: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

function git(directory: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

function commit(directory: string) {
  git(
    directory,
    "-c",
    "user.name=Fixture Author",
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Fixture commit"
  )
}

async function createFixture(configured: boolean) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "git-truck-config-"))
  directories.push(directory)
  git(directory, "init", "--initial-branch=main")
  await writeFile(path.join(directory, "føø.txt"), "Fixture content\n")
  git(directory, "add", "føø.txt")
  commit(directory)
  if (configured) {
    git(directory, "config", "core.quotepath", "true")
    git(directory, "config", "diff.renames", "false")
    git(directory, "config", "diff.renameLimit", "12")
  }
  // Keep completion metadata isolated from the user's Git Truck cache too.
  vi.spyOn(MetadataDB, "getPath").mockReturnValue(path.join(directory, "metadata.json"))
  const instance = await DuckDBInstance.create(":memory:")
  const connection = await instance.connect()
  const db = await new DB({ instance, connection }).init()
  const gitService = new GitService({ repositoryPath: directory, branch: "main" })
  const analysis = new Analysis({ db, gitService, repositoryPath: directory, branch: "main" })
  const readConfig = () => readFile(path.join(directory, ".git", "config"), "utf8")
  return { directory, db, gitService, analysis, readConfig }
}

describe("loadRepoData", () => {
  it.each([false, true])("should preserve repository config after analysis (configured: %s)", async (configured) => {
    const { db, analysis, readConfig } = await createFixture(configured)
    try {
      const before = await readConfig()
      await analysis.loadRepoData()
      expect(analysis.status).toBe("CommitHistoryProcessed")
      expect(await readConfig()).toBe(before)
    } finally {
      await db.close()
    }
  })

  it("should preserve repository config when gathering commits fails", async () => {
    const { db, gitService, analysis, readConfig } = await createFixture(true)
    try {
      const before = await readConfig()
      vi.spyOn(gitService, "gitLogSimple").mockRejectedValue(new Error("Fixture failure"))
      await expect(analysis.loadRepoData()).rejects.toThrow("Fixture failure")
      expect(await readConfig()).toBe(before)
    } finally {
      await db.close()
    }
  })

  it("should preserve Unicode paths and renames when repository config overrides Git defaults", async () => {
    const { directory, db, gitService, analysis, readConfig } = await createFixture(true)
    try {
      git(directory, "mv", "føø.txt", "bår.txt")
      commit(directory)
      const head = git(directory, "rev-parse", "HEAD")
      const before = await readConfig()
      await analysis.loadRepoData()
      expect(await db.query("SELECT fromName, toName FROM renames")).toContainEqual({
        fromName: `${path.basename(directory)}/føø.txt`,
        toName: `${path.basename(directory)}/bår.txt`
      })
      const results = await Promise.all([
        gitService.gitLog(0, 2),
        gitService.gitLogSimple(0, 2, analysis, 0),
        gitService.gitLogSpecificCommits([head])
      ])
      for (const result of results) {
        expect(result).toContain("føø.txt => bår.txt")
      }
      expect(await gitService.lsTree(head)).toContain("bår.txt")
      expect(await readConfig()).toBe(before)
    } finally {
      await db.close()
    }
  })
})
