import { describe } from "node:test"
import { expect, it } from "vitest"
import { DisposableMutex } from "~/server/DisposableMutex"

describe("DisposableMutex", () => {
  it("should acquire and release the mutex when used disposably", async () => {
    const mutex = new DisposableMutex()
    {
      using _signal = await mutex.withDisposable()
      expect(mutex.isLocked()).toBe(true)
    }
    expect(mutex.isLocked()).toBe(false)
  })

  it("should acquire and release the mutex even when errors are thrown in the scope", async () => {
    const mutex = new DisposableMutex()
    try {
      using _signal = await mutex.withDisposable()
      expect(mutex.isLocked()).toBe(true)
      throw new Error("This is an error")
    } catch {
      // ignore
    }
    expect(mutex.isLocked()).toBe(false)
  })
})
