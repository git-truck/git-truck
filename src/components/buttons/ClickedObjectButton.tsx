import { mdiClose } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useDataNullable } from "~/contexts/DataContext"

export function ClickedObjectButton() {
  const { clickedObject, setClickedObject } = useClickedObject()
  const data = useDataNullable()

  if (!clickedObject || !data) return null

  return (
    <button
      className="btn btn--primary"
      title="Deselect clicked object"
      onClick={() => {
        setClickedObject(null)
      }}
    >
      <Icon path={mdiClose} />
      {clickedObject.name}
    </button>
  )
}
