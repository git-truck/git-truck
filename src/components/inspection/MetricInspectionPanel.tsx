import { mdiAccountMultiple, mdiClose, mdiDice5, mdiMagnify } from "@mdi/js"
import { useState, useRef, type ReactNode, createContext, use } from "react"
import { useNavigation } from "react-router"
import { ExpandingPanelButton } from "~/components/buttons/ExpandingPanelButton"
import { ShuffleColorsForm } from "~/components/forms/ShuffleColorsForm"
import { Icon } from "~/components/Icon"
import { GroupContributorsModal } from "~/components/modals/GroupContributorsModal"
import { useResetSelection, useSelectedCategories } from "~/state/stores/selection"
import { cn } from "~/styling"

const MetricSearchContext = createContext<{ searchValue: string; onSearchChange: (value: string) => void }>({
  searchValue: "",
  onSearchChange: () => {}
})

export function useMetricSearchContext() {
  return use(MetricSearchContext)
}

export type MetricPanelActions = {
  search?: boolean
  clear?: boolean
  groupContributors?: boolean
  shuffleContributorColors?: boolean
}

export function MetricInspectionPanel({
  className = "",
  icon,
  children,
  actions = { search: false, clear: false, groupContributors: false }
}: {
  className?: string
  icon: string
  children: ReactNode
  actions?: MetricPanelActions
}) {
  const [selectedSearch, setSelectedSearch] = useState("")
  const [open, setOpen] = useState(false)
  const { state } = useNavigation()

  return (
    <div className="mt-4">
      <div className={cn("flex w-full flex-col gap-0", className)}>
        <div className="flex w-full flex-row items-end justify-between align-bottom">
          <button className="btn--primary border-border dark:border-border-dark flex shrink-0 flex-row items-center gap-2 rounded-t-lg rounded-b-none border-2 p-2">
            <Icon path={icon} size="1em" />
          </button>
          <div className="flex h-full flex-row gap-1 justify-self-end align-bottom">
            {actions.search ? <SearchButton value={selectedSearch} onChange={setSelectedSearch} /> : null}
            {actions.groupContributors ? (
              <>
                <ExpandingPanelButton icon={mdiAccountMultiple} onClick={() => setOpen(true)}>
                  Group contributors
                </ExpandingPanelButton>
                <GroupContributorsModal open={open} onClose={() => setOpen(false)} />
              </>
            ) : null}
            {actions.shuffleContributorColors ? (
              <ShuffleColorsForm>
                <ExpandingPanelButton
                  iconClassName={cn({
                    "animate-spin transition-all starting:rotate-0": state !== "idle"
                  })}
                  icon={mdiDice5}
                >
                  Shuffle colors
                </ExpandingPanelButton>
              </ShuffleColorsForm>
            ) : null}
            {actions.clear ? <ClearSelectionButton /> : null}
          </div>
        </div>
        <div className="border-border dark:border-border-dark bg-primary-bg dark:bg-primary-bg-dark -mt-0.5 rounded-b-lg border-2 p-2">
          <div className="mt-2">
            <MetricSearchContext value={{ searchValue: selectedSearch, onSearchChange: setSelectedSearch }}>
              {children}
            </MetricSearchContext>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClearSelectionButton() {
  const resetSelection = useResetSelection()
  const selectedCategories = useSelectedCategories()
  const hasSelection = selectedCategories.length > 0

  return (
    <ExpandingPanelButton
      disabled={!hasSelection}
      icon={mdiClose}
      danger={hasSelection}
      expanded={hasSelection}
      onClick={resetSelection}
    >
      Clear
    </ExpandingPanelButton>
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
        <Icon path={mdiMagnify} size="1em" />
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
          onKeyDown={(evt) => {
            if (evt.key === "Escape") {
              evt.currentTarget.blur()
              evt.stopPropagation()
            }
          }}
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
