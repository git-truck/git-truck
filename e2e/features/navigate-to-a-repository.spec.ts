import { test, expect } from "@playwright/test"

test("navigate to a repository", async ({ page }) => {
  await page.goto("/")

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Git Truck/)

  const gitTruckCard = page.locator(".card", { has: page.locator("text=git-truck") })

  // Select an option from a <select> dropdown.
  await gitTruckCard.locator("select").selectOption("main")
  // Click the analyze button.
  await gitTruckCard
    .getByRole("link", {
      name: "Analyze",
    })
    .click()

  await page.waitForURL("/git-truck/main")
  await page.waitForSelector("text=See more repositories")
})
