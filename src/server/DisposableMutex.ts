import { Mutex } from "async-mutex"

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
   * If the mutex is not released within the specified timeout, it will be automatically released and an error will be thrown.
   * @param timeout The maximum time (in milliseconds) to hold the mutex before it is automatically released. Default is 10 seconds.
   * @returns A disposable that releases the mutex when disposed
   * @example
   * ```ts
   *
   * const disposableMutex = new DisposableMutex()
   * using _ = this.mutex.withDisposable()
   * // The mutex is now locked and will be released when the block is exited
   */
  public async withDisposable(): Promise<Disposable> {
    await this.mutex.acquire()

    return {
      [Symbol.dispose]: () => {
        this.mutex.release()
      }
    }
  }
}
