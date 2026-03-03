import { mdiCog } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "~/components/modals/ModalManager"

export function SettingsButton() {
  const { openModal } = useModal("app-settings")
  return (
    <button className="btn btn--icon" title="Settings" aria-label="Settings" onClick={() => openModal()}>
      <Icon path={mdiCog} />
    </button>
  )
}
