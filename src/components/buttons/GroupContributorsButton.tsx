import { mdiAccountMultiple } from "@mdi/js"
import { useState } from "react"
import { useNavigation } from "react-router"
import { Icon } from "~/components/Icon"
import { GroupContributorsModal } from "~/components/modals/GroupContributorsModal"
import { cn } from "~/styling"

export function GroupAuthorsButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const { formData } = useNavigation()
  const isGroupingContributors = formData?.has("contributorGroups") === true
  return (
    <>
      <button
        className={cn("btn", {
          "btn--icon": compact
        })}
        title={isGroupingContributors ? "Grouping contributors... " : "Group contributors"}
        aria-label="Group contributors"
        disabled={isGroupingContributors}
        onClick={() => setOpen(true)}
      >
        <Icon path={mdiAccountMultiple} />
        {compact ? null : <span>Group contributors</span>}
      </button>
      <GroupContributorsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
