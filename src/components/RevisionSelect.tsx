import { SelectPlaceholder, SelectWithIconWrapper } from "./util"
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
    <SelectWithIconWrapper>
      <GitBranch display="inline-block" height="1em" color={iconColor ?? "#333"} />
      {allEntriesFlattened.length === 1 ? (
        <SelectPlaceholder>{allEntriesFlattened[0]}</SelectPlaceholder>
      ) : (
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
      )}
    </SelectWithIconWrapper>
  )
}
