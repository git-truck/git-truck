import type { SelectHTMLAttributes } from "react"
import type { GitRefs } from "~/analyzer/model"
import { GitBranch } from "@styled-icons/octicons/GitBranch"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs
  analyzedHeads: Record<string, boolean>
  iconGroupColorMap?: Record<string, string>
  iconColor?: string
}

export function RevisionSelect({
  headGroups,
  analyzedHeads,
  iconColor,
  disabled,
  className = "",
  ...props
}: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  const allEntriesFlattened = groupsEntries.reduce<string[]>((acc, heads) => {
    return acc.concat(Object.keys(heads))
  }, [])

  return (
    <div className="grid w-full grid-cols-[auto_1fr] place-items-center gap-2">
      <GitBranch display="inline-block" height="1em" color={iconColor ?? "#333"} />
      <select className={`input ${className}`} {...props}>
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
          ) : null
        )}
      </select>
    </div>
  )
}
