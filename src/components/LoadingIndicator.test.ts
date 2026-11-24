import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { pollAnalysisProgress } from "~/components/LoadingIndicator"

describe("pollAnalysisProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("should publish progress updates and send the last seen revision", async () => {
    const firstProgress = { progress: 10, analysisStatus: "ProcessingCommitHistory", progressRevision: 1 }
    const secondProgress = { progress: 20, analysisStatus: "ProcessingCommitHistory", progressRevision: 2 }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(firstProgress))
      .mockResolvedValueOnce(Response.json(secondProgress))
    vi.stubGlobal("fetch", fetchMock)
    const onProgress = vi.fn()
    const stop = pollAnalysisProgress("repo", "main", onProgress)

    await vi.advanceTimersByTimeAsync(0)
    expect(onProgress).toHaveBeenLastCalledWith(firstProgress)
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("lastSeenRevision")

    await vi.advanceTimersByTimeAsync(1000)
    expect(onProgress).toHaveBeenLastCalledWith(secondProgress)
    expect(String(fetchMock.mock.calls[1][0])).toContain("lastSeenRevision=1")
    stop()
  })

  it("should not overlap requests while a long poll is pending", async () => {
    const pendingResponse = Promise.withResolvers<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise)
    vi.stubGlobal("fetch", fetchMock)
    const stop = pollAnalysisProgress("repo", "main", vi.fn())

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    stop()
    pendingResponse.resolve(new Response(null, { status: 204 }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("should retry after a failed progress request", async () => {
    const progress = { progress: 20, analysisStatus: "ProcessingCommitHistory", progressRevision: 2 }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(progress))
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const onProgress = vi.fn()
    const stop = pollAnalysisProgress("repo", "main", onProgress)

    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenCalledWith(progress)
    stop()
  })

  it.each(["Aborted", "CommitHistoryProcessed"])("should stop polling after %s", async (analysisStatus) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ progress: 100, analysisStatus, progressRevision: 3 }))
    vi.stubGlobal("fetch", fetchMock)
    const stop = pollAnalysisProgress("repo", "main", vi.fn())

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    stop()
  })

  it("should abort the pending request and ignore late updates on cleanup", async () => {
    const pendingResponse = Promise.withResolvers<Response>()
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise)
    vi.stubGlobal("fetch", fetchMock)
    const onProgress = vi.fn()
    const stop = pollAnalysisProgress("repo", "main", onProgress)

    stop()
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    pendingResponse.resolve(
      Response.json({ progress: 50, analysisStatus: "ProcessingCommitHistory", progressRevision: 4 })
    )
    await vi.advanceTimersByTimeAsync(5000)
    expect(onProgress).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
