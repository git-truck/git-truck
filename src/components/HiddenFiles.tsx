import { useData } from "~/contexts/DataContext"
import { Form, useLocation, useNavigation } from "react-router"
import { mdiEyeOff, mdiEye } from "@mdi/js"
import { ChevronButton } from "./ChevronButton"
import Icon from "@mdi/react"
import { memo, useId, useState } from "react"
import { Popover } from "./Popover"

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}

export const HiddenFiles = memo(function HiddenFiles() {
  const location = useLocation()
  const navigationState = useNavigation()
  const { databaseInfo } = useData()
  const expandHiddenFilesButtonId = useId()

  return (
    <Popover
      popoverTitle={`Hidden files (${databaseInfo.hiddenFiles.length})`}
      className="min-w-10"
      trigger={({ onClick }) => (
        <button
          className="btn"
          title="Hidden files"
          aria-label="Hidden files"
          aria-controls={expandHiddenFilesButtonId}
          onClick={onClick}
        >
          <Icon path={mdiEyeOff} />
        </button>
      )}
    >
      <div className="flex flex-col gap-2">
        {databaseInfo.hiddenFiles.length > 0 ? (
          databaseInfo.hiddenFiles.map((hidden) => (
            <div className="grid grid-cols-[auto_1fr] items-center gap-2" key={hidden} title={hidden}>
              <Form className="w-4" method="post" action={location.pathname}>
                <input type="hidden" name="unignore" value={hidden} />
                <button
                  className="btn--icon btn--hover-swap h-4"
                  title="Show file"
                  disabled={navigationState.state !== "idle"}
                >
                  <Icon path={mdiEyeOff} className="inline-block h-full" />
                  <Icon path={mdiEye} className="hover-swap inline-block h-full" />
                </button>
              </Form>
              <span className="text-sm opacity-70">{hiddenFileFormat(hidden)}</span>
            </div>
          ))
        ) : (
          <div className="text-sm opacity-70">No hidden files</div>
        )}
      </div>
    </Popover>
  )
})
