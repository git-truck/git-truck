import type { SelectHTMLAttributes } from "react"
import type { GitRefs } from "~/analyzer/model"
import { mdiSourceBranch } from "@mdi/js"
import { Icon } from "@mdi/react"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs
  analyzedHeads: Record<string, boolean>
  iconGroupColorMap?: Record<string, string>
}

export function RevisionSelect({
  headGroups,
  analyzedHeads,
  disabled,
  className = "",
  ...props
}: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  return (
    <div className="grid w-full grid-cols-[auto_1fr] place-items-center gap-2">
      <Icon path={mdiSourceBranch} size={0.75} />
      <select className={`input text-gray-800 ${className}`} {...props}>
        {groupsEntries.map(([group, heads]) =>
          Object.entries(heads).length > 0 ? (
            <optgroup key={group} label={group}>
              {Object.entries(heads).map(([headName, head]) => {
                const isAnalyzed = analyzedHeads[head]
                return (
                  <option
                    key={headName}
                    value={headName}
                    disabled={disabled}
                    title={isAnalyzed ? "Analyzed" : "Not analyzed"}
                  >
                    {headName}
                  </option>
                )
              })}
            </optgroup>
          ) : null,
        )}
      </select>
    </div>
  )
}
