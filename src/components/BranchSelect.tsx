import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCodeBranch as branchIcon,
} from "@fortawesome/free-solid-svg-icons"
import { OptionWithEllipsis, SelectPlaceholder, SelectWithEllipsis, SelectWithIconWrapper } from "./util"
import { useId } from "@react-aria/utils"
import { SelectHTMLAttributes } from "react"

interface BranchSelectProps {
  heads: Record<string, string>,
  currentBranch: string,
}

export function BranchSelect({ heads, currentBranch, ...props }: BranchSelectProps & SelectHTMLAttributes<HTMLSelectElement>) {
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
            <OptionWithEllipsis key={hash} value={branchName} selected={currentBranch === branchName}>
              {branchName}
            </OptionWithEllipsis>
          )
        })}
      </SelectWithEllipsis>
    )}
  </SelectWithIconWrapper>
}

