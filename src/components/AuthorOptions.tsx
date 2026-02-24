import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, href, useNavigation } from "react-router"
import { useModal } from "./modals/ModalManager"

export function AuthorOptions() {
  const transitionState = useNavigation()
  const action = href("/view")

  const { openModal } = useModal("group-authors")

  return (
    <div className="mt-2 grid w-full grid-cols-[1fr_1fr] gap-2">
      <button className="btn" onClick={() => openModal()}>
        <Icon path={mdiAccountMultiple} />
        Group authors
      </button>
      <Form method="post" action={action}>
        <input type="hidden" name="rerollColors" value="" />
        <button className="btn w-full" type="submit" disabled={transitionState.state !== "idle"}>
          <Icon path={mdiDiceMultipleOutline} />
          Shuffle colors
        </button>
      </Form>
    </div>
  )
}
