import { mdiEyeOff } from "@mdi/js"
import { useState } from "react"
import { useNavigation } from "react-router"
import { Icon } from "~/components/Icon"
import { HideFilesModal } from "~/components/modals/HideFilesModal"

export function HideFilesButton() {
  const navigation = useNavigation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="btn btn--icon btn--text"
        title="Hidden files"
        aria-label="Hidden files"
        disabled={navigation.state !== "idle"}
        onClick={() => setOpen(true)}
      >
        <Icon path={mdiEyeOff} />
      </button>
      <HideFilesModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
