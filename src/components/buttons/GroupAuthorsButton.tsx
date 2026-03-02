import { mdiAccountMultiple } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useModal } from "~/components/modals/ModalManager"
import { cn } from "~/styling"

export function GroupAuthorsButton({ compact = false }: { compact?: boolean }) {
  const { openModal } = useModal("group-authors")
  return (
    <button
      className={cn("btn", {
        "btn--icon": compact
      })}
      title="Group authors"
      aria-label="Group authors"
      onClick={() => openModal()}
    >
      <Icon path={mdiAccountMultiple} />
      {compact ? null : <span>Group Authors</span>}
    </button>
  )
}
