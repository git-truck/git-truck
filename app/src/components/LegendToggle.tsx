import "./Legend.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faAngleUp } from "@fortawesome/free-solid-svg-icons"

interface LegendProps {
  toggle: () => void
  collapse: boolean
}

export function LegendToggle(props: LegendProps) {
  let c = props.collapse ? "" : "legend-toggle-active"
  return (
    <button className={`legend-toggle ${c}`} onClick={() => props.toggle()}>
      <FontAwesomeIcon icon={faAngleUp} />
    </button>
  )
}
