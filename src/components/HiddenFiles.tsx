import { useBoolean } from "react-use"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"
import { ExpandUp } from "./Toggle"
import { BoxSpan, IconButton } from "./util"
import { Spacer } from "~/components/Spacer"
import { Form, useLocation, useTransition } from "@remix-run/react"
import { VisibilityOff as HiddenIcon, Visibility as ShownIcon } from "@styled-icons/material"

const Line = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--unit);
  margin-top: calc(var(--unit) * 0.5);
  align-items: center;
`

const InlineForm = styled(Form)`
  width: calc(2 * var(--unit));
`

const StyledIconButton = styled(IconButton)`
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
    <div className="box">
      <h3 className="box__subtitle">Hidden files ({analyzerData.hiddenFiles.length})</h3>
      <Spacer />
      <ExpandUp collapse={collapse} toggle={() => setCollapse(!collapse)} />
      {!collapse ? (
        <div>
          {analyzerData.hiddenFiles.map((hidden) => (
            <Line key={hidden} title={hidden}>
              <InlineForm method="post" action={location.pathname}>
                <input type="hidden" name="unignore" value={hidden} />
                <StyledIconButton title="Show file" disabled={transitionState.state !== "idle"}>
                  <HiddenIcon display="inline-block" height="1rem" id="eyeslash" />
                  <ShownIcon display="inline-block" height="1rem" id="eye" />
                </StyledIconButton>
              </InlineForm>
              <BoxSpan>{hiddenFileFormat(hidden)}</BoxSpan>
            </Line>
          ))}
        </div>
      ) : null}
    </div>
  )
}
