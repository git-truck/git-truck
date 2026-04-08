import { mdiCog } from "@mdi/js"
import { useState } from "react"
import { Icon } from "~/components/Icon"
import { SettingsModal } from "~/components/modals/SettingsModal"

export function SettingsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="btn btn--icon" title="Settings" aria-label="Settings" onClick={() => setOpen(true)}>
        <Icon path={mdiCog} />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
