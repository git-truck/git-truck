import { Mutex } from "async-mutex"

type LockSetup = () => Promise<void>

export class DisposableMutex {
  private mutex: Mutex
  constructor() {
    this.mutex = new Mutex()
  }

  public isLocked(): boolean {
    return this.mutex.isLocked()
  }

  /**
   * Acquires the mutex and returns a disposable that releases it when disposed.
   * If setup is provided, it runs after the mutex is acquired and before the disposable is returned.
   * @returns A disposable that releases the mutex when disposed
   * @example
   * ```ts
   *
   * const disposableMutex = new DisposableMutex()
   * using _ = await this.mutex.withDisposable()
   * // The mutex is now locked and will be released when the block is exited
   */
  public async withDisposable(setup?: LockSetup): Promise<Disposable> {
    const releaser = await this.mutex.acquire()

    try {
      await setup?.()
    } catch (error) {
      releaser()
      throw error
    }

    return {
      [Symbol.dispose]: () => {
        releaser()
      }
    }
  }
}
