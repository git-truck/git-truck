import { useBoolean } from "react-use"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { ExpandUp } from "./Toggle"
import { Box, BoxSubTitle, BoxSpan } from "./util"
import { Spacer } from "~/components/Spacer"
import { Form, useLocation, useTransition } from "remix"
import {
  VisibilityOff as HiddenIcon,
  Visibility as ShownIcon
} from "@styled-icons/material"

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
  display: grid;
  place-items: center;
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

function hiddenFileFormat(ignored: string) {
  if (!ignored.includes("/")) return ignored
  const split = ignored.split("/")
  return split[split.length - 1]
}

export function HiddenFiles() {
  const location = useLocation()
  const [collapse, setCollapse] = useBoolean(false)
  const transitionState = useTransition()
  const { analyzerData } = useData()
  return (
    <Box>
      <BoxSubTitle>Hidden files ({analyzerData.hiddenFiles.length})</BoxSubTitle>
      <Spacer />
      <ExpandUp collapse={collapse} toggle={() => setCollapse(!collapse)} />
      {!collapse ? (
        <div>
          {analyzerData.hiddenFiles.map((hidden) => (
            <Line key={hidden} title={hidden}>
              <InlineForm method="post" action={location.pathname}>
                <input type="hidden" name="unignore" value={hidden} />
                <StyledButton title="Show file" disabled={transitionState.state !== "idle"}>
                  <HiddenIcon display="inline-block" height="1rem" id="eyeslash" />
                  <ShownIcon display="inline-block" height="1rem" id="eye" />
                </StyledButton>
              </InlineForm>
              <BoxSpan>{hiddenFileFormat(hidden)}</BoxSpan>
            </Line>
          ))}
        </div>
      ) : null}
    </Box>
  )
}
