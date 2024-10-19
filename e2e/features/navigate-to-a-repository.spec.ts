import { test, expect } from "@playwright/test"

test("navigate to a repository", async ({ page }) => {
  await page.goto("/")

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Git Truck/)

  // Expect the status of the git-truck repository to be "Not analyzed".
  const gitTruckStatus = await page.getByTestId("status-git-truck").textContent()
  expect(gitTruckStatus).toBe("Not analyzed")

  // Select an option from a <select> dropdown.
  await page.getByTestId("revision-select-git-truck").selectOption("main")
  // Click the analyze button.
  await page
    .getByTitle("View git-truck", {
      exact: true
    })
    .click()

  await page.waitForURL("/git-truck/main")
  await page.waitForSelector("text=More repositories")
})
