import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { renameContributorGroup } from "./rename-contributor-group"

describe("renameContributorGroup", () => {
  let instance: DuckDBInstance
  let connection: DuckDBConnection

  beforeEach(async () => {
    instance = await DuckDBInstance.create(":memory:")
    connection = await instance.connect()
    await connection.run("CREATE TABLE contributorGroups (displayName VARCHAR, email VARCHAR, name VARCHAR)")
    await connection.run("INSERT INTO contributorGroups VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)", [
      "Old group",
      "jonas@example.com",
      "Jonas R\u00f8ssum",
      "Old group",
      "alice@example.com",
      "Alice",
      "Other group",
      "bob@example.com",
      "Bob"
    ])
  })

  afterEach(() => {
    connection.closeSync()
    instance.closeSync()
  })

  async function getGroups() {
    return (await connection.runAndReadAll("SELECT * FROM contributorGroups ORDER BY name")).getRowObjects()
  }

  it("should rename the whole group containing Jonas without changing other groups or members", async () => {
    const before = await getGroups()
    await expect(renameContributorGroup(connection)).resolves.toEqual({
      previousName: "Old group",
      displayName: "Box Collab",
      memberCount: 2
    })
    expect(await getGroups()).toEqual(
      before.map((member) => ({
        ...member,
        displayName: member.displayName === "Old group" ? "Box Collab" : member.displayName
      }))
    )
  })

  it("should leave the database unchanged when the member is not found", async () => {
    const before = await getGroups()
    await expect(renameContributorGroup(connection, "Missing member")).rejects.toThrow("found 0")
    expect(await getGroups()).toEqual(before)
  })

  it("should leave the database unchanged when the member belongs to multiple groups", async () => {
    await connection.run("INSERT INTO contributorGroups VALUES (?, ?, ?)", [
      "Another group",
      "jonas-other@example.com",
      "Jonas R\u00f8ssum"
    ])
    const before = await getGroups()
    await expect(renameContributorGroup(connection)).rejects.toThrow("found 2")
    expect(await getGroups()).toEqual(before)
  })

  it("should refuse to merge into an existing group name", async () => {
    const before = await getGroups()
    await expect(renameContributorGroup(connection, "Jonas R\u00f8ssum", "Other group")).rejects.toThrow(
      "already named Other group"
    )
    expect(await getGroups()).toEqual(before)
  })

  it("should reject an empty new name without changing the database", async () => {
    const before = await getGroups()
    await expect(renameContributorGroup(connection, "Jonas R\u00f8ssum", " ")).rejects.toThrow("must not be empty")
    expect(await getGroups()).toEqual(before)
  })
})
