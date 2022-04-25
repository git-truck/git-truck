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
import { GroupedBranchSelect } from "./BranchSelect"

const title = "Git Truck"
const analyzingTitle = "Analyzing | Git Truck"

export function GlobalInfo() {
  const { analyzerData, repo } = useData()
  const { path } = usePath()
  const transitionState = useTransition()

  const location = useLocation()
  const navigate = useNavigate()

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    document.title = isAnalyzing ? analyzingTitle : title
  }, [isAnalyzing])

  const switchBranch = (branch: string) => {
    setIsAnalyzing(true)
    navigate(["", repo.name, branch].join("/"))
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
    paths.push([repo.name, repo.name])
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
      <BoxTitle>{repo.name}</BoxTitle>
      <Spacer />
      <GroupedBranchSelect
          onChange={(e) => switchBranch(e.target.value)}
          headGroups={repo.groups}
        />
      <Spacer />
      <strong>Analyzed: </strong>
      <span>{dateTimeFormatShort(analyzerData.lastRunEpoch)}</span>
      <Spacer />
      <strong>As of commit: </strong>
      <Code inline title={analyzerData.commit.message ?? "No commit message"}>
        {analyzerData.commit.hash.slice(0, 7)}
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
