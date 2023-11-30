import { useClickedObject } from "~/contexts/ClickedContext"
import { CommitHistory } from "./CommitHistory"

export function CommitsCard() {
  const { clickedObject } = useClickedObject()
  if (!clickedObject) return null

  return (
    <div className="card bg-white/70 text-black">
      <CommitHistory />
    </div>
  )
}
