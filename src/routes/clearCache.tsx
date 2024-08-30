import { redirect, type ActionFunction } from "@remix-run/node"
import DB from "~/analyzer/DB.server"

export const action: ActionFunction = async () => {
  await DB.clearCache()
  return redirect("/")
}
