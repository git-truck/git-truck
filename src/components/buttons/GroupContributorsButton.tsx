import { mdiAccountMultiple } from "@mdi/js"
import { useState } from "react"
import { Icon } from "~/components/Icon"
import { GroupContributorsModal } from "~/components/modals/GroupContributorsModal"
import { cn } from "~/styling"

export function GroupAuthorsButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className={cn("btn", {
          "btn--icon": compact
        })}
        title="Group contributors"
        aria-label="Group contributors"
        onClick={() => setOpen(true)}
      >
        <Icon path={mdiAccountMultiple} />
        {compact ? null : <span>Group contributors</span>}
      </button>
      <GroupContributorsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
