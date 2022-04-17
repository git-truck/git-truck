import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faRotate as reanalyzeIcon,
  faFolder as folderIcon,
  faCodeBranch as branchIcon,
  faHashtag as hashIcon,
} from "@fortawesome/free-solid-svg-icons"
import { Form, Link, useTransition } from "remix"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle, Code, TextButton } from "./util"
import styled from "styled-components"
import { useRef, useState } from "react"

const GlobalInfoEntry = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5em;
  place-items: center left;
`

const SelectWithEllipsis = styled.select`
  text-overflow: ellipsis;
  overflow: scroll;
  width: 100%;

  font-size: 0.9em;
  padding: 0.2em 0;

  background: none;
  border-radius: 4px;

  transition: border-color 0.1s;
  border: 2px solid hsla(0, 0%, 50%, 0);

  &:hover,
  &:active {
    border: 2px solid hsla(0, 0%, 50%, 1);
  }
`

const OptionWithEllipsis = styled.option`
  text-overflow: ellipsis;
  overflow: scroll;
`

export function GlobalInfo() {
  const data = useData()
  const { path } = usePath()
  const transitionState = useTransition()
  const [branch, setBranch] = useState(data.branch)
  const newBranchSubmit = useRef<HTMLInputElement | null>(null)

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
      <GlobalInfoEntry>
        <StyledLink to=".." title="See all projects">
          <FontAwesomeIcon icon={folderIcon} color="#333" />
        </StyledLink>
        <BoxTitle>{data.repo}</BoxTitle>
      </GlobalInfoEntry>
      <Spacer />
      <GlobalInfoEntry>
        <FontAwesomeIcon icon={branchIcon} color="#333" />
        <StyledForm method="post" action=".">
          <SelectWithEllipsis
            disabled={transitionState.state !== "idle"}
            name="newBranch"
            value={branch}
            id="branch-selector"
            onChange={(event) => {
              const target = event.target
              setBranch(target.value as string)
              newBranchSubmit.current?.click()
            }}
          >
            {Object.entries(data.refs.heads).map(([branchName, hash]) => {
              return (
                <OptionWithEllipsis key={hash} value={branchName}>
                  {branchName}
                </OptionWithEllipsis>
              )
            })}
          </SelectWithEllipsis>
          <StyledHiddenSubmit ref={newBranchSubmit} type="submit" name="newBranchSubmit" value="" />
        </StyledForm>
      </GlobalInfoEntry>
      <Spacer />
      {!transitionState.submission?.formData.has("newBranch") ? null : (
        <>
          <p style={{ fontSize: "0.9em", color: "hsl(0, 50%, 50%)" }}>Analyzing branch {branch} ...</p>
          <Spacer xxl />
        </>
      )}
      <strong>Analyzed: </strong>
      <span>{dateTimeFormatShort(data.lastRunEpoch)}</span>
      <Spacer />
      <strong>As of commit: </strong>
      <Code inline title={data.commit.message ?? "No commit message"}>
        {data.commit.hash.slice(0, 7)}
      </Code>
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

const StyledHiddenSubmit = styled.input`
  border: none;
  background: none;

  display: hidden;
  pointer-events: none;
`

const StyledLink = styled(Link)`
  display: inline-flex;
  margin-right: var(--unit);
`

const StyledForm = styled(Form)`
  width: 100%;
  display: flex;
  flex-direction: row;
`
