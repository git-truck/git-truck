import { useResetSelection, useSelectedCategories } from "~/state/stores/selection"
import { cn } from "~/styling"

export function ResetSelectionButton() {
  const selectedCategories = useSelectedCategories()
  const resetSelection = useResetSelection()

  const disabled = selectedCategories.length === 0

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
