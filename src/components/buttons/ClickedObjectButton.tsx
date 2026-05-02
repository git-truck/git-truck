import { mdiClose } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { isBlob } from "~/shared/util"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { useData } from "~/contexts/DataContext"

export function ClickedObjectButton() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const data = useData()

  if (!clickedObject || !data) return null

  const clickedObjectName = isBlob(clickedObject) ? clickedObject.name : clickedObject.name + "/"

  return (
    <button
      className="btn btn--primary"
      title={`Deselect ${clickedObjectName}`}
      onClick={() => {
        setClickedObject(null)
      }}
    >
      {clickedObjectName}
      <Icon path={mdiClose} />
    </button>
  )
}
