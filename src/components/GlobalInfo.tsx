import { Form, Link, useLocation, useNavigate, useTransition } from "@remix-run/react"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { Spacer } from "./Spacer"
import { SelectWithIconWrapper } from "./util"
import styled from "styled-components"
import { useEffect, useState } from "react"
import { RevisionSelect } from "./RevisionSelect"
import { Refresh as RefreshIcon, Folder as FolderIcon } from "@styled-icons/material"

const title = "Git Truck"
const analyzingTitle = "Analyzing | Git Truck"

export function GlobalInfo() {
  const { analyzerData, repo } = useData()
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

  return (
    <div className="box">
      <SelectWithIconWrapper>
        <StyledLink to=".." title="See all repositories">
          <FolderIcon display="inline-block" height="1rem" />
          <StyledP>See more repositories</StyledP>
        </StyledLink>
      </SelectWithIconWrapper>
      <Spacer />
      <h2 className="box__title">{repo.name}</h2>
      <Spacer />
      <RevisionSelect
        key={repo.currentHead}
        disabled={isAnalyzing}
        onChange={(e) => switchBranch(e.target.value)}
        defaultValue={analyzerData.branch}
        headGroups={repo.refs}
        analyzedHeads={repo.analyzedHeads}
      />
      <Spacer />
      <strong>Analyzed: </strong>
      <span>{dateTimeFormatShort(analyzerData.lastRunEpoch)}</span>
      <Spacer />
      <strong>As of commit: </strong>
      <span title={analyzerData.commit.message ?? "No commit message"}>{analyzerData.commit.hash.slice(0, 7)}</span>
      <Spacer />
      <strong>Files analyzed: </strong>
      <span>{analyzerData.commit.fileCount ?? 0}</span>
      <Spacer xl />
      <Form
        method="post"
        action={location.pathname}
        onSubmit={() => {
          setIsAnalyzing(true)
        }}
      >
        <input type="hidden" name="refresh" value="true" />
        <button className="btn" disabled={transitionState.state !== "idle"}>
          <RefreshIcon display="inline-block" height="1rem" />
          {isAnalyzing ? "Analyzing..." : "Reanalyze"}
        </button>
      </Form>
    </div>
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
