import { mdiAccountMultiple } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "../modals/ModalManager"

export function GroupAuthorsButton({ compact = false }: { compact?: boolean }) {
  const { openModal } = useModal("group-authors")
  return (
    <button
      className="btn hover:text-primary-text dark:hover:text-primary-text-dark relative flex cursor-pointer justify-between gap-2"
      title="Group authors"
      onClick={() => openModal()}
    >
      <Icon path={mdiAccountMultiple} />
      {compact ? null : <span>Group Authors</span>}
    </button>
  )
}
