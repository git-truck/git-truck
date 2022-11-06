import { useFetcher } from "@remix-run/react"
import { GitLogEntry, HydratedGitBlobObject } from "~/analyzer/model"
import { Button, DetailsKey, DetailsValue, LegendLabel } from "./util"
import { History } from "@styled-icons/material"
import { Fragment, useState } from "react"
import { dateFormatLong } from "~/util"
import { Spacer } from "./Spacer"
import { ExpandDown } from "./Toggle"
import { AuthorDistEntries, AuthorDistHeader, DetailsHeading } from "./Details"
import styled from "styled-components"

interface props {
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitBlobObject
}

export function FileHistoryElement(props: props) {
  const fetcher = useFetcher();

  if (fetcher.state !== "idle") return <p>Loading file history...</p>

  if (!fetcher.data || !Array.isArray(fetcher.data[0]) || props.clickedObject.path !== fetcher.data[1]) {
    return (
      <fetcher.Form method="post" action={location.pathname}>
        <input type="hidden" name="history" value={props.clickedObject.path} />
        <Button
          type="submit"
          disabled={props.state !== "idle"}
          onClick={() => {
            // props.setFetchedPath(props.clickedObject.path)
            // isProcessingHideRef.current = true
          }}
        >
          <History display="inline-block" height="1rem" />
          Show file history
        </Button>
      </fetcher.Form>
    )
  }

  return (
    <CommitHistory commits={fetcher.data[0] as GitLogEntry[]} />
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
        console.log(commit)
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
