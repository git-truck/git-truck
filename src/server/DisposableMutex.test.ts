import { describe, expect, it } from "vitest"
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

  it("should run setup after acquiring the mutex", async () => {
    const mutex = new DisposableMutex()
    let setupRanWhileLocked = false

    {
      using _signal = await mutex.withDisposable(() => {
        setupRanWhileLocked = mutex.isLocked()
        return Promise.resolve()
      })
      expect(mutex.isLocked()).toBe(true)
    }

    expect(setupRanWhileLocked).toBe(true)
    expect(mutex.isLocked()).toBe(false)
  })

  it("should release the mutex when setup rejects", async () => {
    const mutex = new DisposableMutex()

    await expect(
      mutex.withDisposable(() => {
        return Promise.reject(new Error("Setup failed"))
      })
    ).rejects.toThrow("Setup failed")

    expect(mutex.isLocked()).toBe(false)
  })
})

const assertSetupTypes = () => {
  const mutex = new DisposableMutex()

  // @ts-expect-error setup must be lazy, not an already-started promise
  void mutex.withDisposable(Promise.resolve())

  // @ts-expect-error setup must return a promise
  void mutex.withDisposable(() => undefined)
}

void assertSetupTypes
