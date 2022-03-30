import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useBoolean } from "react-use";
import styled from "styled-components";
import { useData } from "~/contexts/DataContext";
import { ExpandUp } from "./Toggle";
import { Box, BoxSubTitle, InlineCode } from "./util";
import { Form, useTransition } from "remix";

const Line = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--unit);
  margin-top: calc(var(--unit) * 0.5);
`

const InlineForm = styled(Form)`
  width: calc(2 * var(--unit));
  height: 100%;
`

const StyledButton = styled.button`
  display: block;
  position: relative;
  height: 100%;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  
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

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
    <ExpandUp
      collapse={collapse}
      toggle={() => setCollapse(!collapse)}
    />
    {!collapse ? <div>
      {data.hiddenFiles.map(hidden => <Line key={hidden} title={hidden}>
        <InlineForm method="post" action="/repo">
          <input type="hidden" name="unignore" value={hidden} />
          <StyledButton title="Show file" disabled={transitionState.state !== "idle"}>
            <StyledFontAwesomeIcon id="eyeslash" icon={faEyeSlash} />
            <StyledFontAwesomeIcon id="eye" icon={faEye} />
          </StyledButton>
        </InlineForm>
        <InlineCode>
          {hiddenFileFormat(hidden)}
        </InlineCode>
      </Line>)}
    </div> : null}
  </Box>
}
