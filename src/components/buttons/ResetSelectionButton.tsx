import { useResetSelection } from "~/state/stores/selection"
import { cn } from "~/styling"

export function ResetSelectionButton({ disabled }: { disabled: boolean }) {
  const resetSelection = useResetSelection()

  return (
    <button
      className={cn("btn btn--text btn--danger p-0", {
        "cursor-not-allowed opacity-50": disabled
      })}
      title="Reset selection"
      disabled={disabled}
      onClick={resetSelection}
    >
      Reset selection
    </button>
  )
}
