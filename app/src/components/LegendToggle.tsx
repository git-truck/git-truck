import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleUp } from "@fortawesome/free-solid-svg-icons"
import { LegendButton } from "./util"

interface LegendProps {
  toggle: () => void
  collapse: boolean
}

export function LegendToggle(props: LegendProps) {
  return (
    <LegendButton collapse={props.collapse} onClick={() => props.toggle()}>
      <FontAwesomeIcon icon={faAngleUp} />
    </LegendButton>
  )
}
