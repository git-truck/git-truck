import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import { browserCommands } from "./e2e/browser-commands"

export default defineConfig({
  test: {
    include: ["e2e/**/*.spec.ts"],
    exclude: ["node_modules"],
    allowOnly: !process.env.CI,
    retry: process.env.CI ? 2 : 0,
    testTimeout: 2 * 60 * 1000,
    hookTimeout: 2 * 60 * 1000,
    fileParallelism: false,
    globalSetup: "./e2e/global-setup.ts",
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          channel: "chromium"
        }
      }),
      headless: true,
      trace: "on-first-retry",
      screenshotDirectory: "test-results/screenshots",
      screenshotFailures: true,
      commands: browserCommands,
      instances: [{ browser: "chromium" }]
    }
  }
})
