import { TimeRangePresetButtons } from "~/components/forms/TimeRangePresetButtons"
import { TimeUnitForm } from "~/components/forms/TimeUnitForm"
import { ClickedObjectButton } from "~/components/buttons/ClickedObjectButton"
import { useData } from "~/contexts/DataContext"
import { isTree } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"
import { DropdownMenu } from "radix-ui"
import { mdiDotsVertical } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"
import type { ReactNode } from "react"

export function TimelineHeader({ dropdownButtons }: { dropdownButtons: Array<DropdownButton> }) {
  const clickedObject = useClickedObject()
  const data = useData()

  return (
    <div className="card__title flex w-full items-center justify-between gap-4">
      <h2
        className="flex items-center gap-2"
        title={isTree(clickedObject) ? "Commits that changed this folder" : "Commits that changed this file"}
      >
        <div className="truncate">Commit activity</div>
        <ClickedObjectButton />
      </h2>

      <div className="flex items-center justify-end gap-4">
        <TimeUnitForm />

        <TimeRangePresetButtons unit={data.databaseInfo.commitCountPerTimeIntervalUnit} />
        <SettingsButton metricMenuItems={dropdownButtons} />
      </div>
    </div>
  )
}

type DropdownButton = {
  icon: string
  label: ReactNode
  onClick: () => void
}

function SettingsButton({ metricMenuItems }: { metricMenuItems: Array<DropdownButton> }) {
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={metricMenuItems.length === 0}>
          <button
            disabled={metricMenuItems.length === 0}
            aria-label="Panel options"
            title="Panel options"
            className="btn btn--text btn--icon flex items-center"
          >
            <Icon path={mdiDotsVertical} size="1em" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          alignOffset={5}
          className="bg-primary-bg dark:bg-primary-bg-dark z-1 -mt-0.5 normal-case"
        >
          <DropdownMenu.Arrow className="fill-border dark:fill-border-dark" />
          {metricMenuItems.map((item, index) => (
            <DropdownMenu.Item
              key={index}
              className={cn(
                "btn -mt-0.5 flex cursor-pointer flex-row items-center justify-start rounded-none px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700",
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
