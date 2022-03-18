import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleUp } from "@fortawesome/free-solid-svg-icons"
import { ToggleButton } from "./util"

interface ToggleProps {
  toggle: () => void
  collapse: boolean
  relative: boolean
}

export function Toggle(props: ToggleProps) {
  return (
    <ToggleButton
      relative={props.relative}
      collapse={props.collapse}
      onClick={props.toggle}
    >
      <FontAwesomeIcon icon={faAngleUp} />
    </ToggleButton>
  )
}
