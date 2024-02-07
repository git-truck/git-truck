import { CommitHistory } from "./CommitHistory"
import { CommitSettings } from "./CommitSettings"

export function CommitsCard() {
  return (
    <>
      <div className="card mb-2 bg-black/20">
        <CommitSettings />
      </div>
      <div className="card bg-black/20">
        <CommitHistory />
      </div>
    </>
  )
}
