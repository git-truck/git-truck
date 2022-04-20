import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCodeBranch as branchIcon,
} from "@fortawesome/free-solid-svg-icons"
import { OptionWithEllipsis, SelectPlaceholder, SelectWithEllipsis, SelectWithIconWrapper } from "./util"
import { useId } from "@react-aria/utils"
import { SelectHTMLAttributes } from "react"

interface BranchSelectProps {
  heads: Record<string, string>,
}

export function BranchSelect({ heads, ...props }: BranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const headsEntries = Object.entries(heads)
  return <SelectWithIconWrapper>
    <FontAwesomeIcon icon={branchIcon} color="#333" />
    {headsEntries.length === 1 ? (
      <SelectPlaceholder>{headsEntries[0][0]}</SelectPlaceholder>
    ) : (
      <SelectWithEllipsis {...props}>
        {headsEntries.map(([branchName, hash]) => {
          return (
            <OptionWithEllipsis key={hash} value={branchName}>
              {branchName}
            </OptionWithEllipsis>
          )
        })}
      </SelectWithEllipsis>
    )}
  </SelectWithIconWrapper>
}


type GroupedBranchSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  headGroups: Record<string, Record<string, string>>,
  iconGroupColorMap?: Record<string, string>,
  iconColor?: string
}

export function GroupedBranchSelect({ headGroups, iconColor, ...props }: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const headGroupsEntries = Object.entries(headGroups).map<[string, [string, string][]]>(([group, heads]) => [group, Object.entries(heads)])

  const allEntriesFlattened = headGroupsEntries.reduce<string[]>((acc, [group, heads]) => {
    return acc.concat(heads.map(([branchName]) => branchName))
  }, [])

  return <SelectWithIconWrapper>
    <FontAwesomeIcon icon={branchIcon} color={iconColor ?? "#333"} />
    {allEntriesFlattened.length === 1 ? (
      <SelectPlaceholder>{allEntriesFlattened[0]}</SelectPlaceholder>
    ) : (
      <SelectWithEllipsis {...props}>
        {headGroupsEntries.map(([group, heads]) => (
          heads.length > 0 ? (
            <optgroup key={group} label={group}>
              {heads.map(([branchName]) => (
                <OptionWithEllipsis key={branchName} value={branchName}>
                  {branchName}
                </OptionWithEllipsis>
              ))}
            </optgroup>) : null
        ))}
      </SelectWithEllipsis>
    )}
  </SelectWithIconWrapper>
}
