import { beforeEach, describe, expect, it, vi } from "vitest"
import { log, setLogLevel } from "./log.server"

describe("log methods array argument concatenation", () => {
  setLogLevel("DEBUG")
  const consoleError = vi.spyOn(console, "error").mockImplementation(vi.fn())
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(vi.fn())
  const consoleInfo = vi.spyOn(console, "info").mockImplementation(vi.fn())
  const consoleDebug = vi.spyOn(console, "debug").mockImplementation(vi.fn())

  beforeEach(() => {
    consoleDebug.mockClear()
    consoleInfo.mockClear()
    consoleWarn.mockClear()
    consoleError.mockClear()
  })

  const logArgs = ["foo", 123, { a: 1 }]

  it("log.error forwards array arguments", () => {
    log.error(...logArgs)
    expect(consoleError).toHaveBeenCalled()
    expect(consoleError.mock.calls[0]).toEqual(logArgs)
  })

  it("log.warn forwards array arguments", () => {
    log.warn(...logArgs)
    expect(consoleWarn).toHaveBeenCalled()
    expect(consoleWarn.mock.calls[0]).toEqual(logArgs)
  })

  it("log.info forwards array arguments", () => {
    log.info(...logArgs)
    expect(consoleInfo).toHaveBeenCalled()
    expect(consoleInfo.mock.calls[0]).toEqual(logArgs)
  })

  it("log.debug forwards array arguments", () => {
    log.debug(...logArgs)
    expect(consoleDebug).toHaveBeenCalled()
    expect(consoleDebug.mock.calls[0]).toEqual(logArgs)
  })
})
