import { useBoolean } from "react-use";
import styled from "styled-components";
import { useData } from "~/contexts/DataContext";
import { Toggle } from "./Toggle";
import { Box, BoxSubTitle, BoxTitle } from "./util";

const Ul = styled.ul`
  padding-left: calc(3 * var(--unit));
`

export function IgnoredFiles() {
  const [collapse, setCollapse] = useBoolean(true)
  const data = useData()
  return <Box>
    <BoxSubTitle>Ignored Files</BoxSubTitle>
    <Toggle
      relative={false}
      collapse={collapse}
      toggle={() => setCollapse(!collapse)}
    />
    {!collapse ? <Ul>
      {data.ignoredFiles.map(x => <li key={x}>{x}</li>)}
    </Ul> : null}
  </Box>
}
