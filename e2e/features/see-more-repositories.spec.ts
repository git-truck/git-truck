import { test, expect } from "@playwright/test"

test("More repositories", async ({ page }) => {
  await page.goto("/git-truck/main")
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Git Truck/)
  // Click the get started link.
  await page.getByRole("link", { name: "More repositories" }).click()
  await page.waitForLoadState("domcontentloaded")
  await expect(page).toHaveURL("/")
  await page.getByRole("heading", { name: /Git Truck/ }).waitFor()
})
