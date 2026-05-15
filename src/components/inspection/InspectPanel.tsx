import { useClickedObject, useObjectColor } from "~/state/stores/clicked-object"
import { isDarkColor } from "~/shared/util"
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"

export function InspectPanel() {
  const clickedObject = useClickedObject()
  const objectColor = useObjectColor(clickedObject)

  return (
    <ClickedObjectButton
      style={{
        backgroundColor: objectColor ?? undefined,
        color: objectColor && isDarkColor(objectColor) ? "#fff" : "#000"
      }}
    />
  )
}
