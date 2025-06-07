import { mdiDeleteForever } from "@mdi/js"
import Icon from "@mdi/react"
import { Form, redirect } from "react-router"
import DB from "~/analyzer/DB.server"
import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/clearCache.js"

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData()
  const redirectPath = formData.get("redirect") as string | null
  await InstanceManager.closeAllDBConnections()
  await DB.clearCache()
  return redirect(redirectPath ?? "/")
}

export function ClearCacheForm({ redirectPath }: { redirectPath?: string } = {}) {
  return (
    <Form className="w-4" method="post" action={"/clearCache"}>
      <input type="hidden" name="redirect" value={redirectPath} />
      <button className="btn" title="Click here if you are experiencing issues">
        <Icon path={mdiDeleteForever} className="hover-swap inline-block h-full" />
        Clear analyzed results
      </button>
    </Form>
  )
}
