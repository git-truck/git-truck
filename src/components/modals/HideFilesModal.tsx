import { mdiEyeOff, mdiDelete, mdiDeleteEmpty } from "@mdi/js"
import { useData } from "~/contexts/DataContext"
import { Icon } from "~/components/Icon"
import { Code } from "~/components/util"
import { useEffect, useMemo, useRef, useState } from "react"
import { getSep } from "~/shared/util"
import { useViewSubmit } from "~/hooks"
import { cn } from "~/styling"
import { Modal } from "~/components/modals/Modal"

export function HideFilesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { databaseInfo } = useData()

  return (
    <HideFilesModalContent
      key={open.toString()}
      open={open}
      initialHiddenFiles={databaseInfo.hiddenFiles}
      onClose={onClose}
    />
  )
}

function HideFilesModalContent({
  open,
  initialHiddenFiles,
  onClose
}: {
  open: boolean
  initialHiddenFiles: string[]
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const submit = useViewSubmit()
  const [hiddenFiles, setHiddenFiles] = useState(initialHiddenFiles)

  const hasChanges = useMemo(
    () => JSON.stringify(initialHiddenFiles) !== JSON.stringify(hiddenFiles),
    [initialHiddenFiles, hiddenFiles]
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <Modal
      open={open}
      title="Hide files"
      icon={mdiEyeOff}
      onClose={() => {
        if (hasChanges) {
          const formData = new FormData()
          formData.append("replaceHiddenFiles", "true")
          for (const hidden of hiddenFiles) {
            formData.append("hidePath", hidden)
          }
          submit(formData, { method: "post" })
        }
        onClose()
      }}
    >
      <div className="flex min-h-0 max-w-[40ch] flex-col items-start justify-center gap-3 overflow-y-auto p-2 pl-0">
        <p className="text-sm">
          Pattern-matched files are hidden from the file tree and excluded from metric computations.
        </p>
        <p className="text-sm">
          Hidden files behave like entries in a <Code inline>.gitignore</Code> file.
        </p>
        <form
          method="post"
          className="flex w-full flex-wrap items-end gap-2"
          onSubmit={(evt) => {
            evt.preventDefault()
            const hidePath = new FormData(evt.currentTarget).get("hide")

            if (typeof hidePath !== "string" || hidePath.length === 0) {
              return
            }

            setHiddenFiles((prev) => (prev.includes(hidePath) ? prev : [hidePath, ...prev]))

            evt.currentTarget.reset()
            inputRef.current?.setCustomValidity("")
          }}
        >
          <label className="label flex min-w-0 flex-1 flex-col gap-2">
            Path or glob
            <input
              ref={inputRef}
              required
              type="text"
              className="input"
              name="hide"
              placeholder="Enter pattern..."
              onChange={(e) => {
                // Update form validity based on whether pattern already exists
                const exists = hiddenFiles.includes(e.target.value)
                e.target.setCustomValidity(exists ? "Pattern already exists" : "")
              }}
            />
          </label>
          <button className="btn btn--primary whitespace-nowrap">Hide</button>
        </form>
        <div className="flex w-full items-center justify-between">
          <h3 className="text-tertiary-text dark:text-tertiary-text-dark text-sm font-bold tracking-wide uppercase">
            Hidden files/patterns
          </h3>
          <button
            type="button"
            className={cn("btn btn--danger btn--text", {
              hidden: hiddenFiles.length === 0
            })}
            onClick={() => {
              setHiddenFiles([])
            }}
          >
            Reset
          </button>
        </div>
        <div className="flex max-h-96 min-h-0 w-full flex-col gap-2 overflow-y-auto">
          {hiddenFiles.length > 0 ? (
            hiddenFiles.map((hidden) => {
              return (
                <div
                  key={hidden}
                  className="secondary grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-0 rounded-md px-2 py-1 text-sm"
                  title={hidden}
                >
                  <span className="truncate text-sm" title={hidden}>
                    {hiddenFileFormat(hidden)}
                  </span>
                  <button
                    className="btn btn--text btn--hover-swap h-6"
                    title={`Unhide ${hidden}`}
                    onClick={() => {
                      setHiddenFiles((prev) => prev.filter((f) => f !== hidden))
                    }}
                  >
                    <Icon path={mdiDelete} className="inline-block h-full" />
                    <Icon path={mdiDeleteEmpty} className="hover-swap inline-block h-full" />
                  </button>
                </div>
              )
            })
          ) : (
            <div className="text-secondary-text dark:text-secondary-text-dark text-sm opacity-70">No hidden files</div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes(getSep(ignored))) return ignored
  const split = ignored.split(getSep(ignored))
  return split[split.length - 1]
}
