import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useBoolean } from "react-use";
import styled from "styled-components";
import { useData } from "~/contexts/DataContext";
import { Toggle } from "./Toggle";
import { Box, BoxSubTitle } from "./util";
import { Form, useTransition } from "remix";


const Ul = styled.ul`
  padding-left: calc(3 * var(--unit));
`

const InlineForm = styled(Form)`
  display: inline-block;
`

export function IgnoredFiles() {
  const [collapse, setCollapse] = useBoolean(true)
  const transitionState = useTransition()
  const data = useData()
  return <Box>
    <BoxSubTitle>Ignored Files ({data.ignoredFiles.length})</BoxSubTitle>
    <Toggle
      relative={false}
      collapse={collapse}
      toggle={() => setCollapse(!collapse)}
    />
    {!collapse ? <Ul>
      {data.ignoredFiles.map(ignored => <li key={ignored}>{ignored}
        <InlineForm method="post" action="/repo/">
          <input type="hidden" name="unignore" value={ignored} />
          <button disabled={transitionState.state === "submitting"}>
            <FontAwesomeIcon icon={faEyeSlash} />
          </button>
        </InlineForm>
      </li>)}
    </Ul> : null}
  </Box>
}
