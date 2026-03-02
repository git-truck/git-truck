import { mdiRefresh } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, useNavigation } from "react-router"
import { cn } from "~/styling"
import { useViewAction } from "~/hooks"

export function RefreshButton() {
  const navigation = useNavigation()
  const isRefreshing = navigation.formData?.get("refresh") === "true"
  const viewAction = useViewAction()

  return (
    <Form method="post" action={viewAction} className="contents">
      <input type="hidden" name="refresh" value="true" />
      <button className="btn btn--icon" disabled={isRefreshing} title="Refresh analysis" aria-label="Refresh analysis">
        <Icon path={mdiRefresh} size="1.25em" className={cn({ "animate-spin": isRefreshing })} />
      </button>
    </Form>
  )
}
