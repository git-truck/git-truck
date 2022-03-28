import { useEffect, useRef, useState } from "react"
import { Form, useTransition } from "remix"
import styled from "styled-components"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { calculateSubTree } from "~/authorUnionUtil"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { AuthorDistOther } from "~/components/AuthorDistOther"
import { Spacer } from "~/components/Spacer"
import { ExpandDown } from "~/components/Toggle"
import { Box, BoxTitle, DetailsKey, DetailsValue, InlineCode, NavigateBackButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { dateFormatLong, last } from "~/util"

export function Details() {
  const { clickedObject } = useClickedObject()
  const { state } = useTransition()
  const { setClickedObject } = useClickedObject()
  const isProcessingHideRef = useRef(false)

  useEffect(() => {
    if (isProcessingHideRef.current) {
      setClickedObject(null)
      isProcessingHideRef.current = false
    }

  }, [clickedObject, setClickedObject, state])

  if (!clickedObject) return null
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <Box>
      <NavigateBackButton
        onClick={() => setClickedObject(null)}
      >
        &times;
      </NavigateBackButton>
      <BoxTitle title={clickedObject.name}>{clickedObject.name}</BoxTitle>
      <Spacer xl />
      <DetailsEntries>
        { isBlob ? <>
          <LineCountEntry
            lineCount={clickedObject.noLines}
            isBinary={clickedObject.isBinary}
          />
          <CommitsEntry clickedBlob={clickedObject} />
          <LastchangedEntry clickedBlob={clickedObject} />
          </> : null }
        <PathEntry path={clickedObject.path} />
      </DetailsEntries>
      <Spacer xl />
      { isBlob ?
        (clickedObject.isBinary ||
          hasZeroContributions(clickedObject.authors) ? null : (
          <AuthorDistribution authors={clickedObject.unionedAuthors} />
        ))
        : <AuthorDistribution authors={calculateSubTree(clickedObject)} />
      }
      <Spacer lg />
      { isBlob ? <>
        <Form method="post" action="/repo">
          <input type="hidden" name="ignore" value={clickedObject.path} />
          <IgnoreButton type="submit" disabled={state !== "idle"} onClick={() => {
            isProcessingHideRef.current = true
          }}>
            Hide this file
          </IgnoreButton>
        </Form>
        {clickedObject.name.includes(".") ? <><Spacer />
          <Form method="post" action="/repo">
            <input type="hidden" name="ignore" value={`*.${extension}`} />
            <IgnoreButton type="submit" disabled={state !== "idle"} onClick={() => {
              isProcessingHideRef.current = true
            }}>
              Hide all <InlineCode>.{extension}</InlineCode> files
            </IgnoreButton>
          </Form></> : null}</>
        : <>
          <Form method="post" action="/repo">
            <input type="hidden" name="ignore" value={clickedObject.path} />
            <IgnoreButton type="submit" disabled={state !== "idle"} onClick={() => {
              isProcessingHideRef.current = true
            }}>
              Hide this folder
            </IgnoreButton>
          </Form>
        </>
        }
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
  authors: Record<string, number> | undefined
}) {
  const [collapse, setCollapse] = useState<boolean>(true)
  const contribDist = Object.entries(
    makePercentResponsibilityDistribution(props.authors)
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

function makePercentResponsibilityDistribution(
  unionedAuthors: Record<string, number> | undefined
): Record<string, number> {
  if (!unionedAuthors) throw Error("unionedAuthors is undefined")
  const sum = Object.values(unionedAuthors).reduce((acc, v) => acc + v, 0)

  const newAuthorsEntries = Object.entries(unionedAuthors).reduce(
    (newAuthorOject, [author, contrib]) => {
      const fraction: number = contrib / sum
      return { ...newAuthorOject, [author]: fraction }
    },
    {}
  )

  return newAuthorsEntries
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
