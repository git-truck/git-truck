import { ActionFunction, LoaderFunction, useTransition } from "remix"
import { Navigate } from "react-router-dom"
import { Form, json, useLoaderData } from "remix"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { Spacer } from "~/components/Spacer"
import { makePercentResponsibilityDistribution } from "~/components/Chart"
import { Box, BoxTitle, NavigateBackButton, DetailsKey, DetailsValue, InlineCode, BoxSubTitle } from "~/components/util"
import { dateFormatLong, last } from "~/util"
import styled from "styled-components"
import { useState } from "react"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { AuthorDistOther } from "~/components/AuthorDistOther"
import { Toggle } from "~/components/Toggle"
import { useClickedBlob } from "~/contexts/ClickedContext"

interface DetailsData {
  blob?: HydratedGitBlobObject
}

export const loader: LoaderFunction = async ({ params, }) => {
  if (params.data) {
    return json<DetailsData>({
      blob: JSON.parse(Buffer.from(params.data, 'base64').toString('utf8'))
    })
  }
}

export default function DetailsRoute() {
  const loaderData = useLoaderData<DetailsData>()

  if (loaderData?.blob) {
    return <Details blob={loaderData.blob} />
  }
  return <Navigate to=".." replace={true} />
}

function Details({ blob }: { blob: HydratedGitBlobObject }) {
  const extension = last(blob.name.split("."))
  const { state } = useTransition()
  const { setClickedBlob } = useClickedBlob()

  return (
    <Box>
      <NavigateBackButton
        onClick={() => setClickedBlob(null)}
        to=".."
      >
        &times;
      </NavigateBackButton>
      <BoxSubTitle title={blob.name}>{blob.name}</BoxSubTitle>
      <Spacer xl />
      <StyledDetailsEntries>
        <LineCountEntry
          lineCount={blob.noLines}
          isBinary={blob.isBinary}
        />
        <CommitsEntry clickedBlob={blob} />
        <LastchangedEntry clickedBlob={blob} />
        <PathEntry path={blob.path} />
      </StyledDetailsEntries>
      <Spacer xl />
      {blob.isBinary ||
        hasZeroContributions(blob.authors) ? null : (
        <AuthorDistribution currentClickedBlob={blob} />
      )}
      <Spacer lg />
        <Form method="post" action="/repo">
          <input type="hidden" name="ignore" value={`*.${extension}`} />
          {(blob.name.includes(".") && blob.name[0] !== ".") ? 
            <IgnoreButton disabled={state === "submitting"}>
              Ignore all files of this extension (<InlineCode>*.{extension}</InlineCode>)
            </IgnoreButton>
            : null
          }
        </Form>
        <Spacer />
        <Form method="post" action="/repo">
          <input type="hidden" name="ignore" value={blob.path} />
          <IgnoreButton disabled={state === "submitting"}>
            Ignore this file
          </IgnoreButton>
        </Form>
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
        <DetailsEntries>
          <AuthorDistFragment show={true} items={contribDist} />
        </DetailsEntries>
      </>
    )
  }
  return (
    <>
      <AuthorDistHeader>
        <DetailsHeading>Author distribution</DetailsHeading>
        <Toggle
          relative={true}
          collapse={collapse}
          toggle={() => setCollapse(!collapse)}
        />
      </AuthorDistHeader>
      <Spacer xs />
      <DetailsEntries>
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
      </DetailsEntries>
    </>
  )
}


const DetailsHeading = styled.h3`
  font-size: calc(var(--unit) * 2);
  padding-top: calc(var(--unit));
  padding-bottom: calc(var(--unit) * 0.5);
  font-size: 1.1em;
`

const DetailsEntries = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 calc(var(--unit) * 3);
`

const StyledDetailsEntries = styled(DetailsEntries)`
  gap: var(--unit) calc(var(--unit) * 3);
  & > p {
    text-align: left;
  }
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
