import { describe, it, expect, vi } from "vitest"
import { extractFileExtension, runProcess } from "./util.server"
import { log } from "./log.server"
import { spawn } from "node:child_process"
import ServerInstance from "./ServerInstance.server"

vi.mock("node:child_process")
vi.mock("node:path", () => ({
  resolve: vi.fn((...args) => args.join("/"))
}))
vi.mock("./log.server", () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

describe("runProcess", () => {
  it("should resolve with the process output", async () => {
    const mockSpawn = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("output"))
          }
          if (event === "end") {
            callback()
          }
        })
      },
      stderr: {
        once: vi.fn()
      },
      once: vi.fn(),
      on: vi.fn()
    }
    spawn.mockReturnValue(mockSpawn)

    const result = await runProcess("/test/dir", "testCommand", ["arg1", "arg2"])

    expect(result).toBe("output")
    expect(log.debug).toHaveBeenCalledWith("exec /test/dir $ testCommand arg1 arg2")
    expect(log.debug).toHaveBeenCalledWith("Started process undefined in /test/dir")
  })

  it("should reject with an error if the process exits with a non-zero code", async () => {
    const mockSpawn = {
      stdout: {
        on: vi.fn()
      },
      stderr: {
        once: vi.fn()
      },
      once: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === "exit") {
          callback(1)
        }
      })
    }
    spawn.mockReturnValue(mockSpawn)

    await expect(runProcess("/test/dir", "testCommand", ["arg1", "arg2"])).rejects.toThrow(
      "Process exited with code: 1"
    )
  })

  it("should reject with an error if the process emits an error", async () => {
    const mockSpawn = {
      stdout: {
        on: vi.fn()
      },
      stderr: {
        once: vi.fn()
      },
      once: vi.fn((event, callback) => {
        if (event === "error") {
          callback(new Error("test error"))
        }
      }),
      on: vi.fn()
    }
    spawn.mockReturnValue(mockSpawn)

    await expect(runProcess("/test/dir", "testCommand", ["arg1", "arg2"])).rejects.toThrow("test error")
  })

  it("should call serverInstance.updateProgress if serverInstance and index are provided", async () => {
    const mockServerInstance = {
      updateProgress: vi.fn()
    } as unknown as ServerInstance

    const mockSpawn = {
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === "data") {
            callback(Buffer.from("output"))
          }
          if (event === "end") {
            callback()
          }
        })
      },
      stderr: {
        once: vi.fn()
      },
      once: vi.fn(),
      on: vi.fn()
    }
    spawn.mockReturnValue(mockSpawn)

    await runProcess("/test/dir", "testCommand", ["arg1", "arg2"], mockServerInstance, 0)

    expect(mockServerInstance.updateProgress).toHaveBeenCalledWith(0)
  })
})

