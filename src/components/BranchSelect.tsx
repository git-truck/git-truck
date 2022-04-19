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
  const id = useId()
  const headsEntries = Object.entries(heads)
  return <SelectWithIconWrapper>
    <label htmlFor={id}>
      <FontAwesomeIcon icon={branchIcon} color="#333" />
    </label>
    {headsEntries.length === 1 ? (
      <SelectPlaceholder>{headsEntries[0][0]}</SelectPlaceholder>
    ) : (
      <SelectWithEllipsis
        {...props}
        name={id}
        id={id}
      >
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


interface GroupedBranchSelectProps {
  headGroups: Record<string, Record<string, string>>,
}

export function GroupedBranchSelect({ headGroups, ...props }: GroupedBranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  const headGroupsEntries = Object.entries(headGroups).map<[string, [string, string][]]>(([group, heads]) => [group, Object.entries(heads)])
  return <SelectWithIconWrapper>
    <label htmlFor={id}>
      <FontAwesomeIcon icon={branchIcon} color="#333" />
    </label>
    {headGroupsEntries.length === 1 && headGroupsEntries[0][1].length === 1 ? (
      <SelectPlaceholder>{headGroupsEntries[0][1]}</SelectPlaceholder>
    ) : (
      <SelectWithEllipsis
        {...props}
        name={id}
        id={id}
      >
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
