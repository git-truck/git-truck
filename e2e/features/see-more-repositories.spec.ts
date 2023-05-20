import { test, expect } from "@playwright/test"

test("see more repositories", async ({ page }) => {
  await page.goto("/git-truck/main")
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Git Truck/)
  // Click the get started link.
  await page.getByRole("link", { name: "See more repositories" }).click()
  await page.waitForLoadState("domcontentloaded")
  await page.waitForSelector("text=🚛 Git Truck")
  // Expect to have navigated to the home page.
  await expect(page).toHaveURL("/")
})
