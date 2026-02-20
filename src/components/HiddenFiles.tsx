import { useData } from "~/contexts/DataContext"
import { Form, href, useNavigation } from "react-router"
import { mdiEyeOff, mdiEye } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { memo, useId } from "react"
import { Popover } from "./Popover"

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}

export const HiddenFiles = memo(function HiddenFiles() {
  const navigationState = useNavigation()
  const { databaseInfo } = useData()
  const expandHiddenFilesButtonId = useId()
  const action = href("/view/details")

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
            <div key={hidden} className="grid grid-cols-[auto_1fr] items-center gap-2" title={hidden}>
              <Form className="w-4" method="post" action={action}>
                <input type="hidden" name="unignore" value={hidden} />
                <button
                  className="btn btn--hover-swap h-4"
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
