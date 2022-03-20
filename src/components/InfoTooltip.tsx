import ReactTooltip from "react-tooltip"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons"

export function InfoTooltip(props: {text: string}) {
    return (
        <>
            <FontAwesomeIcon data-tip={props.text} icon={faCircleInfo} opacity="0.6"/>
            <ReactTooltip multiline/>
        </>
    )
}
