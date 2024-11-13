import { redirect, type ActionFunction } from "@remix-run/node"
import { DB } from "~/db.client"
import InstanceManager from "~/analyzer/InstanceManager.client"

export const clientAction: ActionFunction = async () => {
  await InstanceManager.closeAllDBConnections()
  // await DB.clearCache()
  // TODO: Readd
  return redirect("/")
}
