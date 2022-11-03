import styled from "styled-components"
import type { Commit } from "~/analyzer/model"

interface CommitDistOtherProps {
  toggle: () => void
  items: Commit[]
  show: boolean
}

const OtherText = styled.span<{ grow?: boolean }>`
  white-space: pre;
  font-size: 0.7em;
  font-weight: 500;
  opacity: 0.7;
  &:hover {
    cursor: pointer;
  }
`

export function CommitDistOther(props: CommitDistOtherProps) {
  if (!props.show) return null
  return <OtherText onClick={props.toggle}>+ {props.items.length} more</OtherText>
}
