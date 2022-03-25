import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useBoolean } from "react-use";
import styled from "styled-components";
import { useData } from "~/contexts/DataContext";
import { Toggle } from "./Toggle";
import { Box, BoxSubTitle, InlineCode } from "./util";
import { Form, useTransition } from "remix";

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
  width: calc(2 * var(--unit));
  margin-right: calc(1 * var(--unit));

  & > #eye {
    display: none;
  }
  & > #eyeslash {
    opacity: 0.5;
  }
  &:hover > #eye {
    display: block;
  }
  &:hover > #eyeslash {
    display: none;
  }
`


function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}


export function HiddenFiles() {
  const [collapse, setCollapse] = useBoolean(false)
  const transitionState = useTransition()
  const data = useData()
  return <Box>
    <BoxSubTitle>Hidden files ({data.hiddenFiles.length})</BoxSubTitle>
    <Toggle
      relative={false}
      collapse={collapse}
      toggle={() => setCollapse(!collapse)}
    />
    {!collapse ? <div>
      {data.hiddenFiles.map(hidden => <div key={hidden}>
        <InlineForm method="post" action="/repo/">
          <input type="hidden" name="unignore" value={hidden} />
          <StyledButton title="Show file" disabled={transitionState.state !== "idle"}>
            <FontAwesomeIcon id="eyeslash" icon={faEyeSlash} />
            <FontAwesomeIcon id="eye" icon={faEye} />
          </StyledButton>
        </InlineForm>
        <InlineCode>
          {hiddenFileFormat(hidden)}
        </InlineCode>
      </div>)}
    </div> : null}
  </Box>
}
