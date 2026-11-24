import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api"
import { stat } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

export async function renameContributorGroup(
  connection: DuckDBConnection,
  memberName = "Jonas R\u00f8ssum",
  displayName = "Box Collab"
) {
  if (!memberName.trim() || !displayName.trim()) throw new Error("Member and group names must not be empty.")
  displayName = displayName.trim()

  await connection.run("BEGIN TRANSACTION")
  try {
    const groups = (
      await connection.runAndReadAll("SELECT DISTINCT displayName FROM contributorGroups WHERE name = ?", [memberName])
    ).getRowObjects()
    if (groups.length !== 1) {
      throw new Error(`Expected one group containing ${memberName}, found ${groups.length}. No changes made.`)
    }
    const previousName = groups[0].displayName
    if (typeof previousName !== "string") throw new Error("Invalid stored group name.")

    const conflicts = (
      await connection.runAndReadAll(
        "SELECT 1 FROM contributorGroups WHERE displayName = ? AND displayName <> ? LIMIT 1",
        [displayName, previousName]
      )
    ).getRowObjects()
    if (conflicts.length) throw new Error(`A different group is already named ${displayName}. No changes made.`)

    const members = (
      await connection.runAndReadAll(
        "UPDATE contributorGroups SET displayName = ? WHERE displayName = ? RETURNING name",
        [displayName, previousName]
      )
    ).getRowObjects()
    await connection.run("COMMIT")
    return { previousName, displayName, memberCount: members.length }
  } catch (error) {
    await connection.run("ROLLBACK")
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [, , databasePath, memberName, displayName] = process.argv
    if (!databasePath) {
      throw new Error("Usage: pnpm exec tsx scripts/rename-contributor-group.ts <database.db> [member-name] [new-name]")
    }
    if (!(await stat(databasePath)).isFile()) throw new Error("Database path must be an existing file.")

    const instance = await DuckDBInstance.create(resolve(databasePath))
    try {
      const connection = await instance.connect()
      try {
        const result = await renameContributorGroup(connection, memberName, displayName)
        console.log(`Renamed "${result.previousName}" to "${result.displayName}" (${result.memberCount} member rows).`)
      } finally {
        connection.closeSync()
      }
    } finally {
      instance.closeSync()
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
