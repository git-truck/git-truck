import { expect, test } from "vitest"
import { app } from "../browser"

test("navigate to a repository", async () => {
  await app.goto("/")

  // Expect a title "to contain" a substring.
  expect(await app.title()).toMatch(/Git Truck/)

  // Expect the status of the git-truck repository to be "Not analyzed".
  const gitTruckStatus = await app.textByTestId("status-git-truck")
  expect(gitTruckStatus === "Not analyzed" || gitTruckStatus === "Analyzed").toBeTruthy()

  // Select an option from a <select> dropdown.
  await app.selectByTestId("revision-select-git-truck", "main")
  // Click the analyze button.
  await app.clickByTitle("View git-truck", {
    exact: true
  })

  await app.waitForUrl("/git-truck/main")
  await app.waitForSelector("text=More repositories")
})
