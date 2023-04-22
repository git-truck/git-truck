import { useEffect, useRef, useState } from "react"
import { Form, useLocation, useNavigation } from "@remix-run/react"
import type { HydratedGitBlobObject, HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { ExpandDown } from "~/components/Toggle"
import { CloseButton } from "~/components/util"
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
    <div className="card flex flex-col gap-2">
      <CloseButton onClick={() => setClickedObject(null)} />
      <h2 className="card__title animate-blink" title={clickedObject.name}>
        {clickedObject.name}
      </h2>
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
              <EyeClosed className="justify-self-start" />
              Hide this file
            </button>
          </Form>
          {clickedObject.name.includes(".") ? (
            <>
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
                  <EyeClosed />
                  <span>Hide .{extension} files</span>
                </button>
              </Form>
            </>
          ) : null}
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="open" value={clickedObject.path} />
            <button className="btn" disabled={state !== "idle"}>
              <OpenInNew />
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
            <EyeClosed />
            Hide this folder
          </button>
        </Form>
      )}
      <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
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
      </div>
      {isBlob ? (
        <AuthorDistribution authors={clickedObject.unionedAuthors?.[authorshipType]} />
      ) : (
        <AuthorDistribution authors={calculateAuthorshipForSubTree(clickedObject, authorshipType)} />
      )}
      <button className="btn" onClick={props.showUnionAuthorsModal}>
        <PeopleAlt />
        Group authors
      </button>
      <FileHistoryElement state={state} clickedObject={clickedObject} />
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
      <p className="break-all text-sm">{fileCount}</p>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Folders
      </div>
      <p className="break-all text-sm">{folderCount}</p>
    </>
  )
}

function CommitsEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Commits
      </div>
      <p className="break-all text-sm">{props.clickedBlob.commits.length > 0 ? props.clickedBlob.commits.length : 0}</p>
    </>
  )
}

function LastchangedEntry(props: { clickedBlob: HydratedGitBlobObject }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Last changed
      </div>
      <p className="break-all text-sm">{dateFormatLong(props.clickedBlob.lastChangeEpoch)}</p>
    </>
  )
}

function PathEntry(props: { path: string }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Located at
      </div>
      <p className="break-all text-sm" title={props.path}>
        {props.path}
      </p>
    </>
  )
}

function SizeEntry(props: { size: number; isBinary?: boolean }) {
  const size = byteSize(props.size ?? 0)
  return (
    <>
      <div className="flex items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Size
      </div>
      <p className="break-all text-sm">
        {size.value} {size.unit}{" "}
        <span className="opacity-50">
          {props.isBinary ? (
            <>
              <br />
              (binary file)
            </>
          ) : null}
        </span>
      </p>
    </>
  )
}

const authorCutoff = 2

function AuthorDistribution(props: { authors: Record<string, number> | undefined }) {
  const [collapsed, setCollapsed] = useState<boolean>(true)
  const contribDist = Object.entries(makePercentResponsibilityDistribution(props.authors)).sort((a, b) =>
    a[1] < b[1] ? 1 : -1
  )

  const authorsAreCutoff = contribDist.length > authorCutoff + 1
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <h3 className="font-bold">Author distribution</h3>
        {authorsAreCutoff ? (
          <ExpandDown relative={true} collapse={collapsed} toggle={() => setCollapsed(!collapsed)} />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr,auto] gap-1">
        {authorsAreCutoff ? (
          <>
            <AuthorDistFragment show={true} items={contribDist.slice(0, authorCutoff)} />
            <AuthorDistFragment show={!collapsed} items={contribDist.slice(authorCutoff)} />
            {collapsed ? (
              <button
                className="text-left text-xs opacity-70 hover:opacity-100"
                onClick={() => setCollapsed(!collapsed)}
              >
                + {contribDist.slice(authorCutoff).length} more
              </button>
            ) : null}
          </>
        ) : (
          <>
            {contribDist.length > 0 && !hasZeroContributions(props.authors) ? (
              <AuthorDistFragment show={true} items={contribDist} />
            ) : (
              <p>No authors found</p>
            )}
          </>
        )}
      </div>
    </div>
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
