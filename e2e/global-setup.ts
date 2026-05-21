import { spawn, type ChildProcess } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"

const appBaseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000"
const startupTimeoutMs = 120_000

let serverProcess: ChildProcess | undefined

const isServerReady = async () => {
  try {
    const response = await fetch(appBaseUrl)
    return response.ok
  } catch {
    return false
  }
}

const waitForServer = async () => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (await isServerReady()) {
      return
    }

    if (serverProcess?.exitCode !== null) {
      throw new Error(`Git Truck server exited before ${appBaseUrl} became available`)
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for Git Truck server at ${appBaseUrl}`)
}

export default async function setup() {
  if (!process.env.CI && (await isServerReady())) {
    return
  }

  serverProcess = spawn("node", ["./cli.mjs", "--log", "info", "--headless", "--invalidate-cache"], {
    env: process.env,
    stdio: "inherit"
  })

  await waitForServer()

  return async function teardown() {
    if (!serverProcess || serverProcess.killed) {
      return
    }

    serverProcess.kill()
    await delay(500)
  }
}
