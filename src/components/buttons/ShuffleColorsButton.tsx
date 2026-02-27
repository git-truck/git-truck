import { mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, href, useNavigation } from "react-router"

export function ShuffleColorsButton() {
  const transitionState = useNavigation()
  const action = href("/view")

  return (
    <Form method="post" action={action}>
      <input type="hidden" name="rerollColors" value="" />
      <button className="btn w-full" type="submit" disabled={transitionState.state !== "idle"}>
        <Icon path={mdiDiceMultipleOutline} />
        Shuffle colors
      </button>
    </Form>
  )
}
