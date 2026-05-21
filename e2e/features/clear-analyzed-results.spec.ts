import { expect, test } from "vitest"
import { app } from "../browser"

test("clear analyzed results", async () => {
  await app.goto("/")

  // Expect a title "to contain" a substring.
  expect(await app.title()).toMatch(/Git Truck/)
  await app.clickByTitle("Click here if you are experiencing issues", {
    exact: true
  })

  await app.waitForLoadState("networkidle")

  // Expect the status of the git-truck repository to be "Not analyzed".
  const gitTruckStatus = await app.textByTestId("status-git-truck")
  expect(gitTruckStatus).toBe("Not analyzed")
})
