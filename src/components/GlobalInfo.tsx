import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faRotate as reanalyzeIcon,
  faFolder as folderIcon,
  faCodeBranch as branchIcon,
} from "@fortawesome/free-solid-svg-icons"
import { Form, Link, useLocation, useNavigate, useTransition } from "remix"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import {
  Box,
  BoxTitle,
  Code,
  OptionWithEllipsis,
  SelectPlaceholder,
  SelectWithEllipsis,
  SelectWithIconWrapper,
  TextButton,
} from "./util"
import styled from "styled-components"
import { useEffect, useState } from "react"

export function GlobalInfo() {
  const data = useData()
  const { path } = usePath()
  const transitionState = useTransition()

  const location = useLocation()
  // Discard the repo part of the path
  const [, ...branchPieces] = location.pathname.split("/")
  const branch = branchPieces.join("/")
  const navigate = useNavigate()

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const switchBranch = (branch: string) => {
    setIsAnalyzing( true)
    navigate(["", data.repo, branch].join("/"))
  }
  useEffect(() => {
    if (transitionState.state === "idle") {
      setIsAnalyzing(false)
    }
  }, [transitionState.state])

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

  const headsEntries = Object.entries(data.refs.heads)
  return (
    <Box>
      <SelectWithIconWrapper>
        <StyledLink to=".." title="See all repositories">
          <FontAwesomeIcon icon={folderIcon} color="hsl(0, 0%, 60%)" />
          <StyledP>See more repositories</StyledP>
        </StyledLink>
      </SelectWithIconWrapper>
      <Spacer />
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <SelectWithIconWrapper>
        <FontAwesomeIcon icon={branchIcon} color="#333" />
        {headsEntries.length === 1 ? (
          <SelectPlaceholder>{headsEntries[0][0]}</SelectPlaceholder>
        ) : (
          <SelectWithEllipsis
            disabled={transitionState.state !== "idle"}
            name="newBranch"
            id="branch-selector"
            onChange={(event) => {
              switchBranch(event.target.value)
            }}
          >
            {headsEntries.map(([branchName, hash]) => {
              return (
                <OptionWithEllipsis key={hash} value={branchName} selected={data.branch === branchName}>
                  {branchName}
                </OptionWithEllipsis>
              )
            })}
          </SelectWithEllipsis>
        )}
      </SelectWithIconWrapper>
      <Spacer />
      {isAnalyzing ? (
        <>
          <p style={{ fontSize: "0.9em", color: "hsl(0, 50%, 50%)" }}>Analyzing branch {branch} ...</p>
          <Spacer xxl />
        </>
      ) : null}
      <strong>Analyzed: </strong>
      <span>{dateTimeFormatShort(data.lastRunEpoch)}</span>
      <Spacer />
      <strong>As of commit: </strong>
      <Code inline title={data.commit.message ?? "No commit message"}>
        {data.commit.hash.slice(0, 7)}
      </Code>
      <Spacer />
      <Form method="post" action="." onSubmit={() => {
        setIsAnalyzing(true)
      }}>
        <input type="hidden" name="sresh" value="true" />
        <TextButton disabled={transitionState.state !== "idle"}>
          <FontAwesomeIcon icon={reanalyzeIcon} />{" "}
          {!transitionState.submission?.formData.has("refresh") ? "Rerun analyzer" : "Analyzing..."}
        </TextButton>
      </Form>
    </Box>
  )
}

const StyledP = styled.p`
  margin-left: var(--unit);
`

const StyledLink = styled(Link)`
  display: inline-flex;
  margin-right: var(--unit);
  text-decoration: none;
  color: hsl(0, 0%, 60%);
  font-size: 0.9em;
`
