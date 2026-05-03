import { DropdownMenu } from "radix-ui"
import { mdiClose, mdiDotsVertical, mdiInformation, mdiMagnify } from "@mdi/js"
import { useState, useRef, type ReactNode, createContext, use } from "react"
import { ExpandingPanelButton } from "~/components/buttons/ExpandingPanelButton"
import { Icon } from "~/components/Icon"
import { useResetSelection, useSelectedCategories } from "~/state/stores/selection"
import { cn } from "~/styling"

const MetricSearchContext = createContext<{ searchValue: string; onSearchChange: (value: string) => void }>({
  searchValue: "",
  onSearchChange: () => {}
})

export function useMetricSearchContext() {
  return use(MetricSearchContext)
}

export type MetricPanelButton = {
  search?: boolean
  clear?: boolean
}

export type MetricPanelDropdownButton = {
  icon: string
  label: string
  onClick: () => void
}

export function MetricInspectionPanel({
  className = "",
  title,
  children,
  actions = { search: false, clear: false },
  metricMenuItems = [],
  description = "Description not provided."
}: {
  className?: string
  title: string
  children: ReactNode
  actions?: MetricPanelButton
  metricMenuItems: MetricPanelDropdownButton[]
  description: string
}) {
  const [selectedSearch, setSelectedSearch] = useState("")
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className="mt-4">
      <div className={cn("flex w-full flex-col gap-0", className)}>
        <div className="flex w-full flex-row items-end justify-between align-bottom">
          <button
            className="btn btn--primary border-border dark:border-border-dark flex shrink-0 flex-row items-center gap-2 rounded-t-lg rounded-b-none border-2 p-2"
            title={"Toggle " + title + " description"}
            onClick={() => setInfoOpen(!infoOpen)}
          >
            {!infoOpen ? (
              <Icon path={mdiInformation} size="1.25em" className="fill-bg-primary dark:fill-bg-primary-dark ml-auto" />
            ) : null}
            <span className="text-sm font-bold">{title}</span>
          </button>
          <div className="flex h-full flex-row gap-1 justify-self-end align-bottom">
            {actions.search ? <SearchButton value={selectedSearch} onChange={setSelectedSearch} /> : null}
            {actions.clear ? <ClearSelectionButton /> : null}
            <SettingsButton metricMenuItems={metricMenuItems} />
          </div>
        </div>
        <div className="border-border dark:border-border-dark bg-primary-bg dark:bg-primary-bg-dark -mt-0.5 rounded-b-lg border-2 p-2">
          {infoOpen ? (
            <div className="border-blue-primary bg-blue-secondary/30 w-full rounded-lg border-2 py-2">
              <div className="flex h-full flex-row items-center">
                <Icon path={mdiInformation} size="1.25em" className="fill-bg-primary dark:fill-bg-primary-dark mx-2" />
                <div className="h-full w-full items-center">
                  <p className="text-secondary-text dark:text-secondary-text-dark text-xs font-medium">{description}</p>
                </div>
                <button className="btn btn--text" onClick={() => setInfoOpen(false)}>
                  <Icon path={mdiClose} size="1.25em" className="fill-bg-primary dark:fill-bg-primary-dark ml-auto" />
                </button>
              </div>
            </div>
          ) : null}
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

function SettingsButton({ metricMenuItems }: { metricMenuItems: MetricPanelDropdownButton[] }) {
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={metricMenuItems.length === 0}>
          <button
            disabled={metricMenuItems.length === 0}
            aria-label="Panel options"
            title="Panel options"
            className="btn border-border dark:border-border-dark flex shrink-0 flex-row items-center gap-2 rounded-t-lg rounded-b-none border-2 p-2"
          >
            <Icon path={mdiDotsVertical} size="1em" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          alignOffset={5}
          className="bg-primary-bg dark:bg-primary-bg-dark border-border dark:border-border-dark z-1 -mt-0.5"
        >
          <DropdownMenu.Arrow className="fill-border dark:fill-border-dark" />
          {metricMenuItems.map((item, index) => (
            <DropdownMenu.Item
              key={index}
              className={cn(
                "btn -mt-0.5 flex cursor-pointer flex-row items-center rounded-none px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700",
                {
                  "rounded-t-lg": index === 0,
                  "rounded-b-lg": index === metricMenuItems.length - 1
                }
              )}
              onSelect={item.onClick}
            >
              <Icon path={item.icon} size="1em" />
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </>
  )
}

function SearchButton({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="group flex w-fit items-center gap-0">
      <span
        className={cn(
          "btn flex items-center justify-start gap-0 overflow-hidden rounded-t-lg rounded-b-none px-2 transition-all duration-200",
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
