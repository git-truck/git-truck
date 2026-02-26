import { mdiCog } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "../modals/ModalManager"

export function SettingsButton() {
  const { openModal } = useModal("app-settings")
  return (
    <button
      className="btn hover:text-primary-text dark:hover:text-primary-text-dark relative flex cursor-pointer justify-between gap-2"
      title="Visualization settings"
      onClick={() => openModal()}
    >
      <Icon path={mdiCog} />
    </button>
  )
}
