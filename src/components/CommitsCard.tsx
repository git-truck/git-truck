import { useClickedObject } from "~/contexts/ClickedContext"
import { CommitHistory } from "./CommitHistory"
// import { CommitSettings } from "./CommitSettings"

export function CommitsCard(props: { commitCount: number }) {
  const { clickedObject } = useClickedObject()
  if (!clickedObject) return null

  return (
    <>
      <div className="card bg-white/70 text-black">
        <CommitHistory commitCount={props.commitCount} />
      </div>
    </>
  )
}
