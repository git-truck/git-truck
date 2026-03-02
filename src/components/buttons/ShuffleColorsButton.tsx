import { mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, useNavigation } from "react-router"
import { useViewAction } from "~/hooks"

export function ShuffleColorsButton() {
  const transitionState = useNavigation()
  const viewAction = useViewAction()

  return (
    <Form method="post" action={viewAction}>
      <input type="hidden" name="rerollColors" value="" />
      <button className="btn w-full" disabled={transitionState.state !== "idle"}>
        <Icon path={mdiDiceMultipleOutline} />
        Shuffle colors
      </button>
    </Form>
  )
}
