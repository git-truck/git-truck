import { mdiCog } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "../modals/ModalManager"

export function SettingsButton() {
  const { openModal } = useModal("app-settings")
  return (
    <button className="btn btn--icon" title="Visualization settings" onClick={() => openModal()}>
      <Icon path={mdiCog} />
    </button>
  )
}
