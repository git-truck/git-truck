import { useEffect, useRef, useState } from "react"
import { Form, useLocation, useNavigation } from "@remix-run/react"
import styled from "styled-components"
import type { HydratedGitBlobObject, HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { AuthorDistOther } from "~/components/AuthorDistOther"
import { Spacer } from "~/components/Spacer"
import { ExpandDown } from "~/components/Toggle"
import { DetailsValue, CloseButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { usePath } from "~/contexts/PathContext"
import { dateFormatLong, last } from "~/util"
import byteSize from "byte-size"
import type { AuthorshipType } from "~/metrics/metrics"
import { PeopleAlt, OpenInNew } from "@styled-icons/material"
import { EyeClosed } from "@styled-icons/octicons"
import { FileHistoryElement } from "./FileHistoryElement"

function OneFolderOut(path: string) {
  const index = path.lastIndexOf("/")
  const index2 = path.lastIndexOf("\\")
  if (index !== -1) return path.slice(0, index)
  if (index2 !== -1) return path.slice(0, index2)
  return path
}

export function Details(props: { showUnionAuthorsModal: () => void }) {
  const { setClickedObject, clickedObject } = useClickedObject()
  const location = useLocation()
  const { authorshipType } = useOptions()
  const { state } = useNavigation()
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
    <div className="box">
      <CloseButton onClick={() => setClickedObject(null)} />
      <h2 className="box__title" title={clickedObject.name}>
        {clickedObject.name}
      </h2>
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
        <AuthorDistribution authors={clickedObject.unionedAuthors?.[authorshipType]} />
      ) : (
        <AuthorDistribution authors={calculateAuthorshipForSubTree(clickedObject, authorshipType)} />
      )}
      <Spacer xl />
      <FileHistoryElement state={state} clickedObject={clickedObject} />
      <Spacer />
      <button className="btn" onClick={props.showUnionAuthorsModal}>
        <PeopleAlt display="inline-block" height="1rem" />
        Group authors
      </button>
      <Spacer />
      {isBlob ? (
        <>
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="ignore" value={clickedObject.path} />
            <button
              className="btn"
              type="submit"
              disabled={state !== "idle"}
              onClick={() => {
                isProcessingHideRef.current = true
              }}
            >
              <EyeClosed display="inline-block" height="1rem" />
              Hide this file
            </button>
          </Form>
          {clickedObject.name.includes(".") ? (
            <>
              <Spacer />
              <Form method="post" action={location.pathname}>
                <input type="hidden" name="ignore" value={`*.${extension}`} />
                <button
                  className="btn"
                  type="submit"
                  disabled={state !== "idle"}
                  onClick={() => {
                    isProcessingHideRef.current = true
                  }}
                >
                  <EyeClosed display="inline-block" height="1rem" />
                  <span>Hide .{extension} files</span>
                </button>
              </Form>
            </>
          ) : null}
          <Spacer />
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="open" value={clickedObject.path} />
            <button className="btn" disabled={state !== "idle"}>
              <OpenInNew display="inline-block" height="1rem" />
              Open file
            </button>
          </Form>
        </>
      ) : (
        <Form method="post" action={location.pathname}>
          <input type="hidden" name="ignore" value={clickedObject.path} />
          <button
            className="btn"
            type="submit"
            disabled={state !== "idle"}
            onClick={() => {
              isProcessingHideRef.current = true
              setPath(OneFolderOut(path))
            }}
          >
            <EyeClosed display="inline-block" height="1rem" />
            Hide this folder
          </button>
        </Form>
      )}
    </div>
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
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Files
      </div>
      <DetailsValue>{fileCount}</DetailsValue>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Folders
      </div>
      <DetailsValue>{folderCount}</DetailsValue>
    </>
  )
}

function CommitsEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Commits
      </div>
      <DetailsValue>{props.clickedBlob.commits.length > 0 ? props.clickedBlob.commits.length : 0}</DetailsValue>
    </>
  )
}

function LastchangedEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Last changed
      </div>
      <DetailsValue>{dateFormatLong(props.clickedBlob.lastChangeEpoch)}</DetailsValue>
    </>
  )
}

function PathEntry(props: { path: string }) {
  return (
    <>
      <div>Located at</div>
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
      <div className="flex items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Size
      </div>
      <DetailsValue>
        {size.value} {size.unit}{" "}
        <StyledSpan>
          {props.isBinary ? (
            <>
              <br />
              (binary file)
            </>
          ) : null}
        </StyledSpan>
      </DetailsValue>
    </>
  )
}

export const AuthorDistHeader = styled.div`
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

  if (contribDist.length <= authorCutoff + 1) {
    return (
      <>
        <DetailsHeading>Author distribution</DetailsHeading>
        <Spacer />
        <AuthorDistEntries>
          {contribDist.length > 0 && !hasZeroContributions(props.authors) ? (
            <AuthorDistFragment show={true} items={contribDist} />
          ) : (
            <p>No authors found</p>
          )}
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

export const DetailsHeading = styled.h3`
  font-size: calc(var(--unit) * 2);
  padding-top: calc(var(--unit));
  padding-bottom: calc(var(--unit) * 0.5);
  font-size: 1.1em;
`

export const AuthorDistEntries = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
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

function hasZeroContributions(authors?: Record<string, number>) {
  if (!authors) return true
  const authorsList = Object.entries(authors)
  for (const [, contribution] of authorsList) {
    if (contribution > 0) return false
  }
  return true
}

function calculateAuthorshipForSubTree(tree: HydratedGitTreeObject, authorshipType: AuthorshipType) {
  const aggregatedAuthors: Record<string, number> = {}
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
    for (const child of tree.children) {
      if (child.type === "blob") {
        const unionedAuthors = child.unionedAuthors?.[authorshipType]
        if (!unionedAuthors) throw Error("No unioned authors")
        for (const [author, contrib] of Object.entries(unionedAuthors)) {
          aggregatedAuthors[author] = (aggregatedAuthors[author] ?? 0) + contrib
        }
      } else if (child.type === "tree") {
        subTree(child)
      }
    }
  }
  return aggregatedAuthors
}
