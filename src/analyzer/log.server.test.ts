import { log, setLogLevel } from "./log.server"

describe("log methods array argument concatenation", () => {
  setLogLevel("DEBUG")
  const consoleError = jest.spyOn(console, "error").mockImplementation(jest.fn())
  const consoleWarn = jest.spyOn(console, "warn").mockImplementation(jest.fn())
  const consoleInfo = jest.spyOn(console, "info").mockImplementation(jest.fn())
  const consoleDebug = jest.spyOn(console, "debug").mockImplementation(jest.fn())

  it("log.error concatenates array arguments", () => {
    log.error(["foo", 123, { a: 1 }])
    expect(consoleError).toHaveBeenCalled()
    const call = consoleError.mock.calls[0][0]
    expect(call).toContain("foo")
    expect(call).toContain("123")
    expect(call).toContain("[object Object]")
  })

  it("log.warn concatenates array arguments", () => {
    log.warn("foo", 123, { a: 1 })
    expect(consoleWarn).toHaveBeenCalled()
    const call = consoleWarn.mock.calls[0][0]
    expect(call).toContain("foo")
    expect(call).toContain("123")
    expect(call).toContain("[object Object]")
  })

  it("log.info concatenates array arguments", () => {
    log.info("foo", 123, { a: 1 })
    expect(consoleInfo).toHaveBeenCalled()
    const call = consoleInfo.mock.calls[0][0]
    expect(call).toContain("foo")
    expect(call).toContain("123")
    expect(call).toContain("[object Object]")
  })

  it("log.debug concatenates array arguments", () => {
    log.debug("foo", 123, { a: 1 })
    expect(consoleDebug).toHaveBeenCalled()
    const call = consoleDebug.mock.calls[0][0]
    expect(call).toContain("foo")
    expect(call).toContain("123")
    expect(call).toContain("[object Object]")
  })

  it("log.raw concatenates array arguments", () => {
    log.raw("foo", 123, { a: 1 })
    expect(consoleInfo).toHaveBeenCalled()
    const call = consoleInfo.mock.calls[0][0]
    expect(call).toContain("foo")
    expect(call).toContain("123")
    expect(call).toContain("[object Object]")
  })
})
