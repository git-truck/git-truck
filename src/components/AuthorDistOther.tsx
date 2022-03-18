import styled from "styled-components"

interface AuthorDistOtherProps {
  toggle: () => void
  items: [string, number][]
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

export function AuthorDistOther(props: AuthorDistOtherProps) {
  if (!props.show) return null
  return (
    <OtherText onClick={props.toggle}>+ {props.items.length} more</OtherText>
  )
}
