import { GitLogEntry, HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { DetailsKey, DetailsValue, LegendLabel } from "./util"
import { Fragment, useState } from "react"
import { dateFormatLong } from "~/util"
import { Spacer } from "./Spacer"
import { ExpandDown } from "./Toggle"
import { AuthorDistEntries, AuthorDistHeader, DetailsHeading } from "./Details"
import styled from "styled-components"
import { useData } from "~/contexts/DataContext"

interface props {
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitObject
}

export function FileHistoryElement(props: props) {
  const { analyzerData } = useData()

  let fileCommits: GitLogEntry[] = []
  if (props.clickedObject.type === "blob") {
    fileCommits = props.clickedObject.commits.map(c => analyzerData.commits[c])
  } else {
    try {
      fileCommits = Array.from(calculateCommitsForSubTree(props.clickedObject)).map(c => analyzerData.commits[c]).sort((a, b) => b.time - a.time)
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <CommitHistory commits={fileCommits} />
  )
}

interface CommitDistFragProps {
  items: GitLogEntry[]
  show: boolean
}

export function CommitDistFragment(props: CommitDistFragProps) {
  if (!props.show) return null

  return (
    <>
      {props.items.map((commit) => {
        return (
          <Fragment key={commit.time.toString() + commit.message}>
            <DetailsKey title={commit.message + " (" + commit.author + ")"} grow>
              <LegendLabel style={{ opacity: 0.7 }}>{commit.message}</LegendLabel>
            </DetailsKey>
            <DetailsValue>{dateFormatLong(commit.time)}</DetailsValue>
          </Fragment>
        )
      })}
    </>
  )
}

function CommitHistory(props: { commits: GitLogEntry[] | undefined }) {
  const [collapse, setCollapse] = useState<boolean>(true)
  const commits = props.commits ?? []
  const commitCutoff = 2

  if (commits.length <= commitCutoff + 1) {
    return (
      <>
        <DetailsHeading>Commit History</DetailsHeading>
        <Spacer />
        <AuthorDistEntries>
          {commits.length > 0 ? <CommitDistFragment show={true} items={commits} /> : <p>No commits found</p>}
        </AuthorDistEntries>
      </>
    )
  }
  return (
    <>
      <AuthorDistHeader>
        <DetailsHeading>Commit History</DetailsHeading>
        <ExpandDown relative={true} collapse={collapse} toggle={() => setCollapse(!collapse)} />
      </AuthorDistHeader>
      <Spacer xs />
      <AuthorDistEntries>
        <CommitDistFragment show={true} items={commits.slice(0, commitCutoff)} />
        <CommitDistFragment show={!collapse} items={commits.slice(commitCutoff)} />
        <Spacer />
        <CommitDistOther show={collapse} items={commits.slice(commitCutoff)} toggle={() => setCollapse(!collapse)} />
      </AuthorDistEntries>
      </>
  )
}


interface CommitDistOtherProps {
  toggle: () => void
  items: GitLogEntry[]
  show: boolean
}

const OtherText = styled.span<{ grow?: boolean }>`
  white-space: pre;
  font-size: 0.7em;
  font-weight: 500;
  opacity: 0.7;
  &:hover {
    cursor: pointer;
  }
`

export function CommitDistOther(props: CommitDistOtherProps) {
  if (!props.show) return null
  return <OtherText onClick={props.toggle}>+ {props.items.length} more</OtherText>
}

function calculateCommitsForSubTree(tree: HydratedGitTreeObject) {
  const commitSet = new Set<string>()
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
    for (const child of tree.children) {
      if (!child) continue
      if (child.type === "blob") {
        if (!child.commits) continue
        for (const commit of child.commits) {
          commitSet.add(commit)
        }
      } else if (child.type === "tree") {
        subTree(child)
      }
    }
  }
  return commitSet
}