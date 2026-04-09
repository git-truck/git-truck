import type { SelectHTMLAttributes } from "react"
import type { CompletedResult, GitRefs } from "~/shared/model"
import { mdiSourceBranch } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { cn } from "~/styling"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs
  iconGroupColorMap?: Record<string, string>
}

export function RevisionSelect({
  headGroups,
  disabled,
  className = "",
  ...props
}: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  return (
    <div title="Change branch" className={cn("input grid grid-cols-[auto_1fr] place-items-center", className)}>
      <Icon path={mdiSourceBranch} size={0.75} />
      <select className={cn("w-full", className)} {...props}>
        {groupsEntries.map(([group, heads]) =>
          Object.entries(heads).length > 0 ? (
            <optgroup key={group} label={group}>
              {Object.entries(heads).map(([headName]) => (
                <option key={headName} value={headName} disabled={disabled}>
                  {headName}
                </option>
              ))}
            </optgroup>
          ) : null
        )}
      </select>
    </div>
  )
}
