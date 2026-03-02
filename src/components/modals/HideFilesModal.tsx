import { mdiEyeOff, mdiEye } from "@mdi/js"
import { useNavigation, Form } from "react-router"
import { useData } from "~/contexts/DataContext"
import { Icon } from "~/components/Icon"
import { Code } from "~/components/util"
import { useRef } from "react"
import { getSep } from "~/shared/util"
import { useViewAction } from "~/hooks"

export function HideFilesModal() {
  const navigationState = useNavigation()
  const { databaseInfo } = useData()
  const inputRef = useRef<HTMLInputElement>(null)
  const viewAction = useViewAction()

  // Optimistic UI: extract the pattern being submitted
  const optimisticHide =
    navigationState.state !== "idle" && navigationState.formData
      ? (navigationState.formData.get("hide") as string | null)
      : null

  const optimisticUnhide =
    navigationState.state !== "idle" && navigationState.formData
      ? (navigationState.formData.get("show") as string | null)
      : null

  // Merge optimistic and actual hidden files, checking against actual data to avoid duplicates
  const displayedHiddenFiles = [...databaseInfo.hiddenFiles]
  if (optimisticHide && !databaseInfo.hiddenFiles.includes(optimisticHide)) {
    displayedHiddenFiles.unshift(optimisticHide) // Add to beginning since list is DESC order
  }
  const filteredHiddenFiles = displayedHiddenFiles.filter((path) => path !== optimisticUnhide)

  return (
    <div className="flex min-h-0 max-w-[40ch] flex-col items-start justify-center gap-3 overflow-y-auto p-2 pl-0">
      <p className="text-sm">
        Pattern-matched files are hidden from the file tree and excluded from metric computations.
      </p>
      <p className="text-sm">
        Hidden files behave like entries in a <Code inline>.gitignore</Code> file.
      </p>
      <Form
        action={viewAction}
        method="post"
        className="flex w-full flex-wrap items-end gap-2"
        onSubmit={() => {
          // Clear after form data is captured
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.value = ""
            }
          }, 0)
        }}
      >
        <label className="label flex min-w-0 flex-1 flex-col gap-2">
          Path or glob
          <input
            ref={inputRef}
            type="text"
            className="input"
            name="hide"
            placeholder="Enter pattern..."
            onChange={(e) => {
              // Update form validity based on whether pattern already exists
              const exists = databaseInfo.hiddenFiles.includes(e.target.value)
              e.target.setCustomValidity(exists ? "Pattern already exists" : "")
            }}
          />
        </label>
        <button className="btn btn--primary whitespace-nowrap">Hide</button>
      </Form>
      <h3 className="text-tertiary-text dark:text-tertiary-text-dark text-sm font-bold tracking-wide uppercase">
        Hidden files/patterns
      </h3>
      <div className="flex max-h-96 min-h-0 w-full flex-col gap-2 overflow-y-auto">
        {filteredHiddenFiles.length > 0 ? (
          filteredHiddenFiles.map((hidden) => {
            const isOptimistic = hidden === optimisticHide
            const isPendingRemoval = hidden === optimisticUnhide
            return (
              <div
                key={hidden}
                className="primary grid grid-cols-[auto_1fr] items-center gap-2 rounded-md px-2 py-1 text-sm"
                style={{ opacity: isOptimistic ? 0.6 : isPendingRemoval ? 0.4 : 1 }}
                title={hidden}
              >
                <Form className="w-4" method="post">
                  <input type="hidden" name="show" value={hidden} />
                  <button
                    className="btn btn--text btn--hover-swap h-4"
                    title="Show file"
                    disabled={navigationState.state !== "idle" || isOptimistic}
                  >
                    <Icon path={mdiEyeOff} className="inline-block h-full" />
                    <Icon path={mdiEye} className="hover-swap inline-block h-full" />
                  </button>
                </Form>
                <span className="truncate text-sm" title={hidden}>
                  {hiddenFileFormat(hidden)}
                </span>
              </div>
            )
          })
        ) : (
          <div className="text-secondary-text dark:text-secondary-text-dark text-sm opacity-70">No hidden files</div>
        )}
      </div>
    </div>
  )
}

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes(getSep(ignored))) return ignored
  const split = ignored.split(getSep(ignored))
  return split[split.length - 1]
}
