import { CommitHistory } from "./CommitHistory"
import { CommitSettings } from "./CommitSettings"

export function CommitsCard() {
  return (
    <>
      <div className="card mb-2 bg-white/70 text-black">
        <CommitSettings />
      </div>
      <div className="card bg-white/70 text-black">
        <CommitHistory />
      </div>
    </>
  )
}
