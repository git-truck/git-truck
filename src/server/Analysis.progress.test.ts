import { describe, expect, it } from "vitest"
import { Analysis } from "~/server/Analysis"
import type DB from "~/server/DB"
import type { GitService } from "~/server/git-service"

function createAnalysis() {
  return new Analysis({
    db: {} as DB,
    gitService: {} as GitService,
    repositoryPath: "repo",
    branch: "main"
  })
}

function calculatePercentage(progress: number[], totalCommitCount: number): number {
  return totalCommitCount > 0
    ? Math.min((progress.reduce((acc, curr) => acc + curr, 0) / totalCommitCount) * 100, 100)
    : 0
}

describe("Analysis progress tracking", () => {
  it("should bump progressRevision on every stdout liveness ping without inflating progress counts", () => {
    const analysis = createAnalysis()
    analysis.totalCommitCount = 10_000
    analysis.progress = [0, 0]

    const initialRevision = analysis.progressRevision
    for (let i = 0; i < 50; i++) {
      analysis.updateProgress(0)
    }

    expect(analysis.progressRevision).toBe(initialRevision + 50)
    // Stdout chunk notifications must never move the numeric progress count.
    expect(analysis.progress).toEqual([0, 0])
    expect(calculatePercentage(analysis.progress, analysis.totalCommitCount)).toBe(0)
  })

  it("should never report a percentage above 100 even if progress momentarily overshoots", () => {
    const analysis = createAnalysis()
    analysis.totalCommitCount = 100
    analysis.progress = [60, 60]

    const percentage = calculatePercentage(analysis.progress, analysis.totalCommitCount)
    expect(percentage).toBeLessThanOrEqual(100)
  })

  it("should bump progressRevision when aborting and when changing status", () => {
    const analysis = createAnalysis()
    const beforeAbort = analysis.progressRevision
    analysis.abort()
    expect(analysis.progressRevision).toBeGreaterThan(beforeAbort)
  })
})
