import { useEffect, useRef, useState } from "react"
import { Form, useTransition } from "remix"
import styled from "styled-components"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { AuthorDistOther } from "~/components/AuthorDistOther"
import { makePercentResponsibilityDistribution } from "~/components/Chart"
import { Spacer } from "~/components/Spacer"
import { ExpandDown } from "~/components/Toggle"
import { Box, BoxTitle, DetailsKey, DetailsValue, InlineCode, NavigateBackButton } from "~/components/util"
import { useClickedBlob } from "~/contexts/ClickedContext"
import { dateFormatLong, last } from "~/util"

export function Details() {
  const { clickedBlob } = useClickedBlob()
  const { state } = useTransition()
  const { setClickedBlob } = useClickedBlob()
  const isProcessingHideRef = useRef(false)

  useEffect(() => {
    if (isProcessingHideRef.current) {
      setClickedBlob(null)
      isProcessingHideRef.current = false
    }

  }, [clickedBlob, setClickedBlob, state])

  if (!clickedBlob) return null

  const extension = last(clickedBlob.name.split("."))

  return (
    <Box>
      <NavigateBackButton
        onClick={() => setClickedBlob(null)}
      >
        &times;
      </NavigateBackButton>
      <BoxTitle title={clickedBlob.name}>{clickedBlob.name}</BoxTitle>
      <Spacer xl />
      <DetailsEntries>
        <LineCountEntry
          lineCount={clickedBlob.noLines}
          isBinary={clickedBlob.isBinary}
        />
        <CommitsEntry clickedBlob={clickedBlob} />
        <LastchangedEntry clickedBlob={clickedBlob} />
        <PathEntry path={clickedBlob.path} />
      </DetailsEntries>
      <Spacer xl />
      {clickedBlob.isBinary ||
        hasZeroContributions(clickedBlob.authors) ? null : (
        <AuthorDistribution currentClickedBlob={clickedBlob} />
      )}
      <Spacer lg />
      <Form method="post" action="/repo">
        <input type="hidden" name="ignore" value={clickedBlob.path} />
        <IgnoreButton type="submit" disabled={state !== "idle"} onClick={() => {
          isProcessingHideRef.current = true
        }}>
          Hide this file
        </IgnoreButton>
      </Form>
      {clickedBlob.name.includes(".") ? <><Spacer />
        <Form method="post" action="/repo">
          <input type="hidden" name="ignore" value={`*.${extension}`} />
          <IgnoreButton type="submit" disabled={state !== "idle"} onClick={() => {
            isProcessingHideRef.current = true
          }}>
            Hide all <InlineCode>.{extension}</InlineCode> files
          </IgnoreButton>
        </Form></> : null}
    </Box>
  )
}

function CommitsEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <DetailsKey grow>Commits</DetailsKey>
      <DetailsValue>
        {props.clickedBlob.noCommits > 0 ? props.clickedBlob.noCommits : 0}
      </DetailsValue>
    </>
  )
}

function LastchangedEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <DetailsKey grow>Last changed</DetailsKey>
      <DetailsValue>
        {dateFormatLong(props.clickedBlob.lastChangeEpoch)}
      </DetailsValue>
    </>
  )
}

function PathEntry(props: { path: string }) {
  return (
    <>
      <DetailsKey>Located at</DetailsKey>
      <DetailsValue title={props.path}>{props.path}</DetailsValue>
    </>
  )
}

const StyledSpan = styled.span`
  opacity: 0.5;
`

function LineCountEntry(props: { lineCount: number; isBinary?: boolean }) {
  return (
    <>
      <DetailsKey grow>Line count</DetailsKey>
      <DetailsValue>
        {props.lineCount ?? 0}{" "}
        <StyledSpan>{props.isBinary ? "(binary file)" : null}</StyledSpan>
      </DetailsValue>
    </>
  )
}

const AuthorDistHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const authorCutoff = 2

function AuthorDistribution(props: {
  currentClickedBlob: HydratedGitBlobObject
}) {
  const [collapse, setCollapse] = useState<boolean>(true)
  const contribDist = Object.entries(
    makePercentResponsibilityDistribution(props.currentClickedBlob)
  ).sort((a, b) => (a[1] < b[1] ? 1 : -1))

  if (contribDist.length === 0) return null
  if (contribDist.length <= authorCutoff + 1) {
    return (
      <>
        <DetailsHeading>Author distribution</DetailsHeading>
        <Spacer xs />
        <AuthorDistEntries>
          <AuthorDistFragment show={true} items={contribDist} />
        </AuthorDistEntries>
      </>
    )
  }
  return (
    <>
      <AuthorDistHeader>
        <DetailsHeading>Author distribution</DetailsHeading>
        <ExpandDown
          relative={true}
          collapse={collapse}
          toggle={() => setCollapse(!collapse)}
        />
      </AuthorDistHeader>
      <Spacer xs />
      <AuthorDistEntries>
        <AuthorDistFragment
          show={true}
          items={contribDist.slice(0, authorCutoff)}
        />
        <AuthorDistFragment
          show={!collapse}
          items={contribDist.slice(authorCutoff)}
        />
        <AuthorDistOther
          show={collapse}
          items={contribDist.slice(authorCutoff)}
          toggle={() => setCollapse(!collapse)}
        />
      </AuthorDistEntries>
    </>
  )
}


const DetailsHeading = styled.h3`
  font-size: calc(var(--unit) * 2);
  padding-top: calc(var(--unit));
  padding-bottom: calc(var(--unit) * 0.5);
  font-size: 1.1em;
`

const AuthorDistEntries = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 calc(var(--unit) * 3);
  & > ${ DetailsValue } {
    text-align: right;
  }
`

const DetailsEntries = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--unit) calc(var(--unit) * 3);
`

const IgnoreButton = styled.button`
  background: var(--button-bg);
  width: fit-content;
  border: none;
  border-radius: calc(2 * var(--unit));
  padding: var(--unit) calc(2 * var(--unit));
  /* color: #fff; */
  cursor: pointer;
  transition: backround-color var(--hover-transition-duration);
  &:hover {
    background-color: var(--button-hovered-bg);
  }
`

function hasZeroContributions(authors: Record<string, number>) {
  const authorsList = Object.entries(authors)
  for (const [, contribution] of authorsList) {
    if (contribution > 0) return false
  }
  return true
}
