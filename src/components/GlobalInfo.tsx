import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRotate as reanalyzeIcon, faFolder as folderIcon } from "@fortawesome/free-solid-svg-icons"
import { Form, Link, useLocation, useNavigate, useTransition } from "remix"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle, Code, SelectWithIconWrapper, TextButton } from "./util"
import styled from "styled-components"
import { useEffect, useState } from "react"
import { BranchSelect } from "./BranchSelect"

const title = "Git Truck"
const analyzingTitle = "Analyzing | Git Truck"

export function GlobalInfo() {
  const data = useData()
  const { path } = usePath()
  const transitionState = useTransition()

  const location = useLocation()
  const navigate = useNavigate()

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (isAnalyzing) {
      document.title = document.title = analyzingTitle
    } else {
      document.title = document.title = title
    }
  }, [isAnalyzing])

  const switchBranch = (branch: string) => {
    setIsAnalyzing(true)
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

  return (
    <Box>
      <SelectWithIconWrapper>
        <StyledLink to=".." title="See all repositories">
          <FontAwesomeIcon icon={folderIcon} />
          <StyledP>See more repositories</StyledP>
        </StyledLink>
      </SelectWithIconWrapper>
      <Spacer />
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <BranchSelect
        heads={data.refs.heads}
        defaultValue={data.branch}
        onChange={(e) => switchBranch(e.target.value)}
        disabled={transitionState.state !== "idle"}
      />
      <Spacer />
      <strong>Analyzed: </strong>
      <span>{dateTimeFormatShort(data.lastRunEpoch)}</span>
      <Spacer />
      <strong>As of commit: </strong>
      <Code inline title={data.commit.message ?? "No commit message"}>
        {data.commit.hash.slice(0, 7)}
      </Code>
      <Spacer />
      <Form
        method="post"
        action={location.pathname}
        onSubmit={() => {
          setIsAnalyzing(true)
        }}
      >
        <input type="hidden" name="refresh" value="true" />
        <TextButton disabled={transitionState.state !== "idle"}>
          <FontAwesomeIcon icon={reanalyzeIcon} />{" "}
          {isAnalyzing ? "Analyzing..." : "Rerun analyzer"}
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
  align-items: center;
  &:hover {
    color: hsl(0, 0%, 20%);
  }
`
