import { log, setLogLevel } from "./log.server"

describe("log methods array argument concatenation", () => {
  setLogLevel("DEBUG")
  const consoleError = jest.spyOn(console, "error").mockImplementation(jest.fn())
  const consoleWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn())
  const consoleInfo = jest.spyOn(console, "info").mockImplementation(jest.fn())
  const consoleDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn())

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
