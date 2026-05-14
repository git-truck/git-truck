import { mdiClose, mdiFile, mdiFolder } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { useData } from "~/contexts/DataContext"

export function ClickedObjectButton({ style = {} }: { style?: React.CSSProperties }) {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const data = useData()

  if (!clickedObject || !data) return null

  return (
    <button
      className="btn btn--primary"
      title={`Deselect ${clickedObject.name}`}
      style={style}
      onClick={() => {
        setClickedObject(null)
      }}
    >
      <Icon path={clickedObject.type === "tree" ? mdiFolder : mdiFile} />
      {clickedObject.name}
      <Icon path={mdiClose} />
    </button>
  )
}
