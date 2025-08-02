import { mdiRefresh } from "@mdi/js"
import Icon from "@mdi/react"
import { Form, useNavigation } from "react-router"
import { cn } from "~/styling"

export function RefreshButton() {
  const navigation = useNavigation()
  const isRefreshing = navigation.formData?.get("refresh") === "true"
  return (
    <Form method="post" action={navigation.location?.pathname}>
      <input type="hidden" name="refresh" value="true" />
      <button type="submit" className="btn aspect-square p-1" disabled={isRefreshing} title="Refresh analysis">
        <Icon path={mdiRefresh} size="1.25em" className={cn({ "animate-spin": isRefreshing })} />
      </button>
    </Form>
  )
}
