import { mdiEyeOff } from "@mdi/js"
import { useState } from "react"
import { Icon } from "~/components/Icon"
import { HideFilesModal } from "~/components/modals/HideFilesModal"

export function HideFilesButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="btn btn--icon" title="Hidden files" aria-label="Hidden files" onClick={() => setOpen(true)}>
        <Icon path={mdiEyeOff} />
      </button>
      <HideFilesModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
