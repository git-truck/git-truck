import { test, expect } from "@playwright/test"

test("navigate to a repository", async ({ page }) => {
  await page.goto("/")

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Git Truck/)
  await page
    .getByTitle("Click here if you are experiencing issues", {
      exact: true
    })
    .click()

  await page.waitForLoadState("networkidle")

  // Expect the status of the git-truck repository to be "Not analyzed".
  const gitTruckStatus = await page.getByTestId("status-git-truck").textContent()
  expect(gitTruckStatus).toBe("Not analyzed")
})
