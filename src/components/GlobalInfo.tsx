import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRotate as reanalyzeIcon, faLeftLong as backIcon } from "@fortawesome/free-solid-svg-icons"
import { Form, Link, useTransition } from "remix"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle, Code, TextButton } from "./util"
import styled from "styled-components"

export function GlobalInfo() {
  const data = useData()
  const { path } = usePath()
  const transitionState = useTransition()

  let temppath = path
  let paths: [string, string][] = []

  for (let i = 0; i < 3; i++) {
    if (temppath === "") {
      break
    }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx + 1), temppath])
    temppath = temppath.substring(0, idx)
  }
  if (temppath !== "") {
    paths = paths.slice(0, paths.length - 1)
    paths.push(["...", ""])
    paths.push([data.repo, data.repo])
  }

  return (
    <Box>
      <StyledLink to=".." title="See all projects">
        <FontAwesomeIcon icon={backIcon} color="#333" />
      </StyledLink>
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <div>
        <strong>Branch: </strong>
        <span>{data.branch}</span>
        <Spacer />
        <strong>Analyzed: </strong>
        <span>{dateTimeFormatShort(data.lastRunEpoch)}</span>
        <Spacer />
        <strong>As of commit: </strong>
        <Code inline title={data.commit.message ?? "No commit message"}>
          {data.commit.hash.slice(0, 7)}
        </Code>
      </div>
      <Spacer />
      <Form method="post" action=".">
        <input type="hidden" name="refresh" value="true" />
        <TextButton disabled={transitionState.state !== "idle"}>
          <FontAwesomeIcon icon={reanalyzeIcon} />{" "}
          {!transitionState.submission?.formData.has("refresh") ? "Rerun analyzer" : "Analyzing..."}
        </TextButton>
      </Form>
    </Box>
  )
}

const StyledLink = styled(Link)`
  display: inline-flex;
  margin-right: var(--unit);
`
