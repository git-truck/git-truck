import { mdiAccountMultiple, mdiClose, mdiMagnify } from "@mdi/js"
import { useState, useRef, type ReactNode } from "react"
import { Icon } from "~/components/Icon"
import { useModal } from "~/components/modals/ModalManager"
import { useResetSelection, useSelectedCategories } from "~/state/stores/selection"
import { cn } from "~/styling"

//Export search hooks to be used in searchable inspection panels, such as PointLegend
//TODO: Hook this into Commit History
type SearchableContentRenderFn = (props: { searchValue: string; onSearchChange: (value: string) => void }) => ReactNode

type MetricPanelActions = {
  search?: boolean
  clear?: boolean
  groupContributors?: boolean
}

export function MetricInspectionPanel({
  className = "",
  icon,
  contents,
  actions = { search: false, clear: false, groupContributors: false }
}: {
  className?: string
  icon: string
  //TODO: This is a bit finicky, maybe there is a simpler way to pass search downstream to an abstract content?
  contents: ReactNode | SearchableContentRenderFn
  actions?: MetricPanelActions
}) {
  const [selectedSearch, setSelectedSearch] = useState("")
  const { openModal } = useModal("group-contributors")

  const renderedContents =
    typeof contents === "function"
      ? contents({ searchValue: selectedSearch, onSearchChange: setSelectedSearch })
      : contents

  return (
    <div className="mt-4">
      <div className={cn("flex w-full flex-col gap-0", className)}>
        <div className="flex w-full flex-row items-end justify-between align-bottom">
          <button className="btn--primary border-border dark:border-border-dark flex shrink-0 flex-row items-center gap-2 rounded-t-lg rounded-b-none border-2 p-2">
            <Icon path={icon} size="1em" />
          </button>
          <div className="flex h-full flex-row gap-1 justify-self-end align-bottom">
            {actions.search && <SearchButton value={selectedSearch} onChange={setSelectedSearch} />}
            {actions.groupContributors && (
              <ActionButton icon={mdiAccountMultiple} label="Group Contributors" onClick={() => openModal()} />
            )}
            {actions.clear && <ClearSelectionButton />}
          </div>
        </div>
        <div className="border-border dark:border-border-dark bg-primary-bg dark:bg-primary-bg-dark -mt-0.5 rounded-b-lg border-2 p-2">
          <div className="mt-2">{renderedContents}</div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  disabled = false,
  onClick,
  danger = false,
  expanded = false
}: {
  icon: string
  label: string
  disabled?: boolean
  onClick?: () => void
  danger?: boolean
  expanded?: boolean
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "btn group flex h-8 w-fit shrink-0 items-center justify-start gap-0 overflow-hidden rounded-t-lg rounded-b-none px-2 transition-all duration-200",
        disabled && "cursor-not-allowed opacity-50",
        danger && "btn--danger border-border border-2"
      )}
      onClick={onClick}
    >
      <span className={cn("transition-transform duration-150")}>
        <Icon path={icon} size="1em" />
      </span>
      <span
        className={cn(
          "max-w-0 overflow-hidden text-xs font-bold whitespace-nowrap transition-all duration-200",
          !expanded && !disabled && "opacity-0 group-hover:ml-2 group-hover:max-w-fit group-hover:opacity-100",
          expanded && "ml-2 max-w-16 opacity-100"
        )}
      >
        {label}
      </span>
    </button>
  )
}

function ClearSelectionButton() {
  const resetSelection = useResetSelection()
  const selectedCategories = useSelectedCategories()
  const hasSelection = selectedCategories.length > 0

  return (
    <ActionButton
      disabled={!hasSelection}
      icon={mdiClose}
      label="Clear"
      danger={hasSelection}
      expanded={hasSelection}
      onClick={resetSelection}
    />
  )
}

function SearchButton({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="group flex h-8 w-fit items-center gap-0">
      <span
        className={cn(
          "btn flex h-8 items-center justify-start gap-0 overflow-hidden rounded-t-lg rounded-b-none px-2 transition-all duration-200",
          value ? "w-auto" : "w-fit max-w-fit group-hover:w-auto"
        )}
        tabIndex={-1}
      >
        <span className="">
          <Icon path={mdiMagnify} size="1em" />
        </span>
        <input
          ref={ref}
          type="text"
          placeholder={`Search…`}
          value={value}
          className={cn(
            "bg-transparent text-sm transition-all duration-200 outline-none",
            value ? "ml-2 w-20" : "w-0 group-hover:ml-2 group-hover:w-20 focus:ml-2 focus:w-20"
          )}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          disabled={!value}
          className={cn(
            "overflow-hidden rounded transition-all duration-200",
            value
              ? "ml-2 w-auto p-0.5 opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
              : "ml-0 w-0 cursor-not-allowed opacity-0"
          )}
          title="Clear search"
          onClick={() => {
            onChange("")
            if (document.activeElement === ref.current) {
              ref.current?.focus()
            }
          }}
        >
          <Icon path={mdiClose} size="0.75em" />
        </button>
      </span>
    </div>
  )
}

export type { SearchableContentRenderFn, MetricPanelActions }
