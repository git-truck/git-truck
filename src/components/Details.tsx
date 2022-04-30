import { useEffect, useRef, useState } from "react"
import { Form, useLocation, useTransition } from "remix"
import styled from "styled-components"
import { HydratedGitBlobObject, HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { calculateAuthorshipForSubTree } from "~/authorUnionUtil"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { AuthorDistOther } from "~/components/AuthorDistOther"
import { Spacer } from "~/components/Spacer"
import { ExpandDown } from "~/components/Toggle"
import { Box, BoxTitle, DetailsKey, DetailsValue, Code, NavigateBackButton, TextButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { usePath } from "~/contexts/PathContext"
import { dateFormatLong, last } from "~/util"
import byteSize from "byte-size"

function OneFolderOut(path: string) {
  const index = path.lastIndexOf("/")
  const index2 = path.lastIndexOf("\\")
  if (index !== -1) return path.slice(0, index)
  if (index2 !== -1) return path.slice(0, index2)
  return path
}

export function Details() {
  const { setClickedObject, clickedObject } = useClickedObject()
  const location = useLocation()
  const { authorshipType } = useOptions()
  const { state } = useTransition()
  const { setPath, path } = usePath()
  const { analyzerData } = useData()
  const isProcessingHideRef = useRef(false)

  useEffect(() => {
    if (isProcessingHideRef.current) {
      setClickedObject(null)
      isProcessingHideRef.current = false
    }
  }, [clickedObject, setClickedObject, state])

  useEffect(() => {
    // Update clickedObject if data changes
    setClickedObject((clickedObject) => findObjectInTree(analyzerData.commit.tree, clickedObject))
  }, [analyzerData, setClickedObject])

  if (!clickedObject) return null
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <Box>
      <NavigateBackButton onClick={() => setClickedObject(null)}>&times;</NavigateBackButton>
      <BoxTitle title={clickedObject.name}>{clickedObject.name}</BoxTitle>
      <Spacer xl />
      <DetailsEntries>
        {isBlob ? (
          <>
            <SizeEntry size={clickedObject.sizeInBytes} isBinary={clickedObject.isBinary} />
            <CommitsEntry clickedBlob={clickedObject} />
            <LastchangedEntry clickedBlob={clickedObject} />
          </>
        ) : (
          <FileAndSubfolderCountEntries clickedTree={clickedObject} />
        )}
        <PathEntry path={clickedObject.path} />
      </DetailsEntries>
      <Spacer />
      {isBlob ? (
        clickedObject.isBinary || hasZeroContributions(clickedObject.authors) ? null : (
          <AuthorDistribution authors={clickedObject.unionedAuthors?.get(authorshipType)} />
        )
      ) : (
        <AuthorDistribution authors={calculateAuthorshipForSubTree(clickedObject, authorshipType)} />
      )}
      <Spacer xl />
      {isBlob ? (
        <>
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="ignore" value={clickedObject.path} />
            <TextButton
              type="submit"
              disabled={state !== "idle"}
              onClick={() => {
                isProcessingHideRef.current = true
              }}
            >
              Hide this file
            </TextButton>
          </Form>
          {clickedObject.name.includes(".") ? (
            <>
              <Spacer />
              <Form method="post" action={location.pathname}>
                <input type="hidden" name="ignore" value={`*.${extension}`} />
                <TextButton
                  type="submit"
                  disabled={state !== "idle"}
                  onClick={() => {
                    isProcessingHideRef.current = true
                  }}
                >
                  <span>Hide all .{extension} files</span>
                </TextButton>
              </Form>
            </>
          ) : null}
          <Spacer />
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="open" value={clickedObject.path} />
            <TextButton disabled={state !== "idle"}>Open file</TextButton>
          </Form>
        </>
      ) : (
        <Form method="post" action={location.pathname}>
          <input type="hidden" name="ignore" value={clickedObject.path} />
          <TextButton
            type="submit"
            disabled={state !== "idle"}
            onClick={() => {
              setPath(OneFolderOut(path))
              isProcessingHideRef.current = true
            }}
          >
            Hide this folder
          </TextButton>
        </Form>
      )}
    </Box>
  )
}

function findObjectInTree(tree: HydratedGitTreeObject, object: HydratedGitObject | null) {
  if (object === null) return null
  let currentTree = tree
  const steps = object.path.split("/")

  for (let i = 0; i < steps.length; i++) {
    for (const child of currentTree.children) {
      if (child.hash === object.hash) return child
      if (child.type === "tree") {
        const childSteps = child.name.split("/")
        if (childSteps[0] === steps[i]) {
          currentTree = child
          i += childSteps.length - 1
          break
        }
      }
    }
  }
  return currentTree
}

function FileAndSubfolderCountEntries(props: { clickedTree: HydratedGitTreeObject }) {
  const folderCount = props.clickedTree.children.filter((child) => child.type === "tree").length
  const fileCount = props.clickedTree.children.length - folderCount

  return (
    <>
      <DetailsKey grow>Files</DetailsKey>
      <DetailsValue>{fileCount}</DetailsValue>
      <DetailsKey grow>Folders</DetailsKey>
      <DetailsValue>{folderCount}</DetailsValue>
    </>
  )
}

function CommitsEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <DetailsKey grow>Commits</DetailsKey>
      <DetailsValue>{props.clickedBlob.noCommits > 0 ? props.clickedBlob.noCommits : 0}</DetailsValue>
    </>
  )
}

function LastchangedEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <DetailsKey grow>Last changed</DetailsKey>
      <DetailsValue>{dateFormatLong(props.clickedBlob.lastChangeEpoch)}</DetailsValue>
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

function SizeEntry(props: { size: number; isBinary?: boolean }) {
  const size = byteSize(props.size ?? 0)
  return (
    <>
      <DetailsKey grow>Size</DetailsKey>
      <DetailsValue>
        {size.value} {size.unit} <StyledSpan>{props.isBinary ? <><br />(binary file)</> : null}</StyledSpan>
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

function AuthorDistribution(props: { authors: Record<string, number> | undefined }) {
  const [collapse, setCollapse] = useState<boolean>(true)
  const contribDist = Object.entries(makePercentResponsibilityDistribution(props.authors)).sort((a, b) =>
    a[1] < b[1] ? 1 : -1
  )

  if (contribDist.length === 0) return null
  if (contribDist.length <= authorCutoff + 1) {
    return (
      <>
        <DetailsHeading>Author distribution</DetailsHeading>
        <Spacer />
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
        <ExpandDown relative={true} collapse={collapse} toggle={() => setCollapse(!collapse)} />
      </AuthorDistHeader>
      <Spacer xs />
      <AuthorDistEntries>
        <AuthorDistFragment show={true} items={contribDist.slice(0, authorCutoff)} />
        <AuthorDistFragment show={!collapse} items={contribDist.slice(authorCutoff)} />
        <Spacer />
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

  const newAuthorsEntries = Object.entries(unionedAuthors).reduce((newAuthorOject, [author, contrib]) => {
    const fraction: number = contrib / sum
    return { ...newAuthorOject, [author]: fraction }
  }, {})

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
  /* gap: 0 calc(var(--unit) * 3); */
  gap: calc(0.5 * var(--unit)) calc(var(--unit) * 3);
  & > ${DetailsValue} {
    text-align: right;
  }
`

const DetailsEntries = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--unit) calc(var(--unit) * 3);
`

function hasZeroContributions(authors: Record<string, number>) {
  const authorsList = Object.entries(authors)
  for (const [, contribution] of authorsList) {
    if (contribution > 0) return false
  }
  return true
}
