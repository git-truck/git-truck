import { mdiClose } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { useData } from "~/contexts/DataContext"

export function ClickedObjectButton() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const data = useData()

  // Don't show a deselect button for the root tree
  if (clickedObject.hash === data.databaseInfo.fileTree.hash) return null

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
