import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCodeBranch as branchIcon,
} from "@fortawesome/free-solid-svg-icons"
import { OptionWithEllipsis, SelectPlaceholder, SelectWithEllipsis, SelectWithIconWrapper } from "./util"
import { SelectHTMLAttributes } from "react"
import { GroupedRefs } from "~/analyzer/git-caller.server"

type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: GroupedRefs,
  iconGroupColorMap?: Record<string, string>,
  iconColor?: string
}

export function GroupedBranchSelect({ headGroups, iconColor, disabled, ...props }: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const groupsEntries = Object.entries(headGroups)

  const allEntriesFlattened = groupsEntries.reduce<string[]>((acc, [, heads]) => {
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
              {Object.entries(heads).map(([branchName, [, isAnalyzed]]) => (
                <OptionWithEllipsis key={branchName} value={branchName} disabled={disabled} title={isAnalyzed ? "Analyzed" : "Not analyzed"}>
                  {isAnalyzed ? "✅" : "❎"} {branchName}
                </OptionWithEllipsis>
              ))}
            </optgroup>) : null
        ))}
      </SelectWithEllipsis>
    )}
  </SelectWithIconWrapper>
}
