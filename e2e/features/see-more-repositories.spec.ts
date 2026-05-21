import { expect, test } from "vitest"
import { app } from "../browser"
import { href } from "react-router"

test("More repositories", async ({ page }) => {
  await page.goto(href("/view") + "?branch=main")
  // Expect a title "to contain" a substring.
  expect(await app.title()).toMatch(/Git Truck/)
  // Click the get started link.
  await app.clickByRole("link", "More repositories")
  await app.waitForLoadState("domcontentloaded")
  expect(new URL(await app.url()).pathname).toBe("/")
  await app.waitForRole("heading", "Git Truck")
})
