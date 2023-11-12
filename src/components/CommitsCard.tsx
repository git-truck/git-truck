import { useClickedObject } from "~/contexts/ClickedContext"
import { FileHistoryElement } from "./FileHistoryElement"
import { useNavigation } from "@remix-run/react"

export function CommitsCard() {
  const { clickedObject } = useClickedObject()
  const { state } = useNavigation()
  if (!clickedObject) return null

  return (
    <div className="card bg-white/70 text-black">
      <FileHistoryElement state={state} clickedObject={clickedObject} />
    </div>
  )
}
