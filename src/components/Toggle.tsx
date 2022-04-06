import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleUp } from "@fortawesome/free-solid-svg-icons"
import styled, { css } from "styled-components"

interface ToggleProps {
  toggle: () => void
  collapse: boolean
  relative?: boolean
}

export function ExpandDown({ relative = false, collapse, toggle }: ToggleProps) {
  return (
    <ToggleButton relative={relative} collapse={collapse} onClick={toggle} up={false}>
      <FontAwesomeIcon icon={faAngleUp} />
    </ToggleButton>
  )
}

export function ExpandUp({ relative = false, collapse, toggle }: ToggleProps) {
  return (
    <ToggleButton relative={relative} collapse={collapse} onClick={toggle} up={true}>
      <FontAwesomeIcon icon={faAngleUp} />
    </ToggleButton>
  )
}

const ToggleButton = styled.button<{
  collapse: boolean
  relative: boolean
  up: boolean
}>`
  ${({ relative, up }) =>
    !relative
      ? css`
          position: absolute;
          right: var(--unit);
          ${up
            ? css`
                bottom: var(--unit);
              `
            : css`
                top: var(--unit);
              `}
        `
      : ""}

  border: none;
  background-color: rgba(0, 0, 0, 0);
  transition-duration: 0.4s;
  color: grey;
  transform-origin: 50% 55%;
  transform: ${(props) => (props.collapse !== props.up ? "rotate(180deg)" : "none")};
  font-size: large;
  &:hover {
    color: #606060;
    cursor: pointer;
  }
`
