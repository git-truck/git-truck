import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
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

const StyledButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: grid;
  align-items: center;
  justify-items: center;

  & > :first-child {
    display: none;
  }
  & > :last-child {
    opacity: 0.5;
  }
  &:hover > :first-child  {
    display: block;
  }
  &:hover > :last-child {
    display: none;
  }
`

export function IgnoredFiles() {
  const [collapse, setCollapse] = useBoolean(false)
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
          <StyledButton title="Show file" disabled={transitionState.state === "submitting"}>
            <FontAwesomeIcon icon={faEyeSlash} />
            <FontAwesomeIcon icon={faEye} />
          </StyledButton>
        </InlineForm>
      </li>)}
    </Ul> : null}
  </Box>
}
