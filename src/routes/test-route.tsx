import { LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { DB } from "~/db.client"
// import InstanceManager from '~/analyzer/InstanceManager.client';
// import DB from "~/analyzer/DB.client"

export const clientLoader = async ({}: LoaderFunctionArgs) => {
  // const db = await DB.createInstance("git-truck", "main")
  // // const client = InstanceManager.getOrCreateInstance("git-truck", "main", "C:/Users/jonas/p/git-truck");
  // // const message = (await client.db.getLatestCommitHash())
  // const message = (await db.query("SELECT 1 + 1 AS sum")).toArray()[0].sum
  const db = await DB.createInstance("git-truck", "main")
  const db2 = await DB.createInstance("git-truck", "migrate-to-vite")

  const data = await db.with(async (c) => {
    await c.query(`
      CREATE TABLE Persons (
        PersonID int,
        FirstName varchar(255)
      );
    `)
    await c.query("INSERT INTO Persons VALUES ('1', 'bob')")
    return (await c.query("SELECT * from Persons")).toArray()[0].FirstName
  })

  const message = data
  return {message}
}

export const HydrateFallback = () => <div>Hydrating...</div>

export default function TestRoute() {
  const {message} = useLoaderData<typeof clientLoader>()

  return (
    <div>
      <h1>{message}</h1>
    </div>
  )
}
