import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCodeBranch as branchIcon,
} from "@fortawesome/free-solid-svg-icons"
import { OptionWithEllipsis, SelectPlaceholder, SelectWithEllipsis, SelectWithIconWrapper } from "./util"
import { SelectHTMLAttributes } from "react"
import { GitRefs } from "~/analyzer/model"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GitRefs,
  analyzedHeads: Record<string, boolean>,
  iconGroupColorMap?: Record<string, string>,
  iconColor?: string
}

export function RevisionSelect({ headGroups, analyzedHeads, iconColor, disabled, ...props }: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  const allEntriesFlattened = groupsEntries.reduce<string[]>((acc, heads) => {
    return acc.concat(Object.keys(heads))
  }, [])

  return <SelectWithIconWrapper>
    <FontAwesomeIcon icon={branchIcon} color={iconColor ?? "#333"} />
    {allEntriesFlattened.length === 1 ? (
      <SelectPlaceholder>{allEntriesFlattened[0]}</SelectPlaceholder>
    ) : (
      <SelectWithEllipsis {...props}>
        {groupsEntries.map(([group, heads]) => (
          Object.entries(heads).length > 0 ? (
            <optgroup key={group} label={group}>
              {Object.entries(heads).map(([headName, head]) => {
                const isAnalyzed = analyzedHeads[head]
                return (
                  <OptionWithEllipsis key={headName} value={headName} disabled={disabled} title={isAnalyzed ? "Analyzed" : "Not analyzed"}>
                    {headName}
                  </OptionWithEllipsis>
                )
              })}
            </optgroup>) : null
        ))}
      </SelectWithEllipsis>
    )}
  </SelectWithIconWrapper>
}
