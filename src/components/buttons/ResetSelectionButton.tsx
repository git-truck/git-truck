import { useResetSelection } from "~/state/stores/selection"

export function ResetSelectionButton() {
  const resetSelection = useResetSelection()

  return (
    <button className="btn btn--text" title="Reset selection" onClick={resetSelection}>
      Reset
    </button>
  )
}
