import { mdiAccountMultiple, mdiDiceMultipleOutline } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { Form, href, useNavigation } from "react-router"

export function AuthorOptions({ showUnionAuthorsModal }: { showUnionAuthorsModal: () => void }) {
  const transitionState = useNavigation()
  const action = href("/view")

  return (
    <>
      <div className="mt-2 grid w-full grid-cols-[1fr_1fr] gap-2">
        <button className="btn" onClick={showUnionAuthorsModal}>
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
    </>
  )
}
