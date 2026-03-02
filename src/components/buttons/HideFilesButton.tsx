import { mdiEyeOff } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "../modals/ModalManager"

export function HideFilesButton() {
  const { openModal } = useModal("ignore-files")

  return (
    <button className="btn btn--icon" title="Hidden files" onClick={() => openModal()}>
      <Icon path={mdiEyeOff} />
    </button>
  )
}
