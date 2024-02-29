import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Form, useFetcher, useLocation, useNavigation } from "@remix-run/react"
import type { HydratedGitObject, HydratedGitTreeObject } from "~/analyzer/model"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { ChevronButton } from "~/components/ChevronButton"
import { CloseButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useData } from "~/contexts/DataContext"
import { useOptions } from "~/contexts/OptionsContext"
import { usePath } from "~/contexts/PathContext"
import { dateFormatLong, getTextColorFromBackground, last, removeFirstPart } from "~/util"
import byteSize from "byte-size"
import { mdiAccountMultiple, mdiOpenInNew, mdiEyeOffOutline, mdiFile, mdiFolder } from "@mdi/js"
import { Icon } from "@mdi/react"
import clsx from "clsx"
import { useMetrics } from "~/contexts/MetricContext"
import { MenuItem, MenuTab } from "./MenuTab"
import { CommitsCard } from "./CommitsCard"

function OneFolderOut(path: string) {
  const index = path.lastIndexOf("/")
  const index2 = path.lastIndexOf("\\")
  if (index !== -1) return path.slice(0, index)
  if (index2 !== -1) return path.slice(0, index2)
  return path
}

export function DetailsCard({
  className = "",
  showUnionAuthorsModal
}: {
  className?: string
  showUnionAuthorsModal: () => void
}) {
  const { setClickedObject, clickedObject } = useClickedObject()
  const location = useLocation()
  const { metricType } = useOptions()
  const { state } = useNavigation()
  const { setPath, path } = usePath()
  const { analyzerData, repodata2, repo } = useData()
  const isProcessingHideRef = useRef(false)

  const slicedPath = useMemo(() => removeFirstPart(clickedObject?.path ?? ""), [clickedObject])

  const [authorContributions, setAuthorContributions] = useState<{author: string, contribs: number}[] | null>(null)
  const contribSum = useMemo(() => {
    if (!authorContributions) return 0
    return authorContributions.reduce((acc, curr) => acc + curr.contribs, 0)
  }, [authorContributions])

  const fetcher = useFetcher()
  
  useEffect(() => {
    const searchParams = new URLSearchParams()
    searchParams.set("branch", repo.currentHead)
    searchParams.set("repo", analyzerData.repo)
    if (!clickedObject?.path) return
    searchParams.set("path", clickedObject.path)
    searchParams.set("isblob", String(clickedObject.type === "blob"))
    fetcher.load(`/api/authordist?${searchParams.toString()}`)
  }, [clickedObject, repo.currentHead, analyzerData.repo])

  useEffect(() => {
    if (fetcher.state === "idle") {
      const data = (fetcher.data ?? []) as {author: string, contribs: number}[]
      setAuthorContributions(data)
    }
  }, [fetcher])

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

  const [metricsData] = useMetrics()
  const { backgroundColor, color, lightBackground } = useMemo(() => {
    if (!clickedObject) {
      return {
        backgroundColor: null,
        color: null,
        lightBackground: true
      }
    }
    const colormap = metricsData.get(metricType)?.colormap
    const backgroundColor = colormap?.get(clickedObject.path) ?? ("#808080" as `#${string}`)
    const color = backgroundColor ? getTextColorFromBackground(backgroundColor) : null
    return {
      backgroundColor: backgroundColor,
      color: color,
      lightBackground: color === "#000000"
    }
  }, [clickedObject, metricsData, metricType])

  if (!clickedObject) return null
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <div
      className={clsx(className, "card flex flex-col gap-2 transition-colors")}
      style={
        color
          ? {
              backgroundColor: backgroundColor,
              color: color
            }
          : {}
      }
    >
      <div className="flex">
        <h2 className="card__title grid grid-cols-[auto,1fr,auto] gap-2">
          <Icon path={clickedObject.type === "blob" ? mdiFile : mdiFolder} size="1.25em" />
          <span className="truncate" title={clickedObject.name}>
            {clickedObject.name}
          </span>
          <CloseButton absolute={false} onClick={() => setClickedObject(null)} />
        </h2>
      </div>
      <MenuTab lightBackground={lightBackground}>
        <MenuItem title="General">
          <div className="flex grow flex-col gap-2">
            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
              {isBlob ? (
                <>
                  <SizeEntry size={clickedObject.sizeInBytes} isBinary={clickedObject.isBinary} />
                  <CommitsEntry count={repodata2.commitCounts.get(slicedPath)}/>
                  <LastchangedEntry epoch={repodata2.lastChanged.get(slicedPath)} />
                </>
              ) : (
                <FileAndSubfolderCountEntries clickedTree={clickedObject} />
              )}
              <PathEntry path={clickedObject.path} />
            </div>
            <div className="card bg-white/70 text-black">
              <AuthorDistribution authors={authorContributions} contribSum={contribSum}/>
            </div>
            <button
              className={clsx("btn", {
                "btn--outlined--light": !lightBackground,
                "btn--outlined": lightBackground
              })}
              onClick={showUnionAuthorsModal}
            >
              <Icon path={mdiAccountMultiple} />
              Group authors
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {isBlob ? (
              <>
                <Form className="w-max" method="post" action={location.pathname}>
                  <input type="hidden" name="ignore" value={clickedObject.path} />
                  <button
                    className={clsx("btn", {
                      "btn--outlined--light": !lightBackground,
                      "btn--outlined": lightBackground
                    })}
                    type="submit"
                    disabled={state !== "idle"}
                    onClick={() => {
                      isProcessingHideRef.current = true
                    }}
                    title="Hide this file"
                  >
                    <Icon path={mdiEyeOffOutline} />
                    Hide
                  </button>
                </Form>
                {clickedObject.name.includes(".") ? (
                  <Form className="w-max" method="post" action={location.pathname}>
                    <input type="hidden" name="ignore" value={`*.${extension}`} />
                    <button
                      className={clsx("btn", {
                        "btn--outlined--light": !lightBackground,
                        "btn--outlined": lightBackground
                      })}
                      type="submit"
                      disabled={state !== "idle"}
                      onClick={() => {
                        isProcessingHideRef.current = true
                      }}
                    >
                      <Icon path={mdiEyeOffOutline} />
                      <span>Hide .{extension} files</span>
                    </button>
                  </Form>
                ) : null}
              </>
            ) : (
              <>
                <Form method="post" action={location.pathname}>
                  <input type="hidden" name="ignore" value={clickedObject.path} />
                  <button
                    className={clsx("btn", {
                      "btn--outlined--light": !lightBackground,
                      "btn--outlined": lightBackground
                    })}
                    type="submit"
                    disabled={state !== "idle"}
                    onClick={() => {
                      isProcessingHideRef.current = true
                      setPath(OneFolderOut(path))
                    }}
                  >
                    <Icon path={mdiEyeOffOutline} />
                    Hide this folder
                  </button>
                </Form>
              </>
            )}
          </div>
        </MenuItem>
        <MenuItem title="Commits">
          <CommitsCard />
        </MenuItem>
      </MenuTab>
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

function CommitsEntry(props: { count: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Commits
      </div>
      <p className="break-all text-sm">{props.count ?? "unknown"}</p>
    </>
  )
}

function LastchangedEntry(props: { epoch: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Last changed
      </div>
      <p className="break-all text-sm">{props.epoch ? dateFormatLong(props.epoch) : "unknown"}</p>
    </>
  )
}

function PathEntry(props: { path: string }) {
  const { state } = useNavigation()
  const { clickedObject } = useClickedObject()
  if (!clickedObject) return null
  return (
    <>
      <div className="flex grow items-center overflow-hidden overflow-ellipsis whitespace-pre text-sm font-semibold">
        Located at
      </div>
      <div className="grid grid-cols-[1fr,auto] items-center justify-between gap-2 break-all text-sm">
        <p className="truncate" title={props.path}>
          {props.path}
        </p>
        <Form method="post" action={location.pathname} title={clickedObject.name}>
          <input type="hidden" name="open" value={clickedObject.path} />
          <button className="btn--icon" disabled={state !== "idle"}>
            <Icon
              path={mdiOpenInNew}
              size="1.25em"
              className="w-max"
              title={clickedObject.type === "blob" ? "Open file in default app" : "Browse folder in system explorer"}
            />
          </button>
        </Form>
      </div>
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

function AuthorDistribution(props: { authors: {author: string, contribs: number}[] | null , contribSum: number}) {
  const authorDistributionExpandId = useId()

  const [collapsed, setCollapsed] = useState<boolean>(true)

  const authorsAreCutoff = (props.authors?.length ?? 0) > authorCutoff + 1
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex justify-between ${authorsAreCutoff ? "cursor-pointer hover:opacity-70" : ""}`}>
        <label className="label grow" htmlFor={authorDistributionExpandId}>
          <h3 className="font-bold">Author distribution</h3>
        </label>
        {authorsAreCutoff ? (
          <ChevronButton id={authorDistributionExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr,auto] gap-1">
        { props.authors === null ? (
          <p>Loading authors...</p>
        )
        : (
        <>
          {authorsAreCutoff ? (
            <>
              <AuthorDistFragment show={true} items={props.authors.slice(0, authorCutoff)} contribSum={props.contribSum} />
              <AuthorDistFragment show={!collapsed} items={props.authors.slice(authorCutoff)} contribSum={props.contribSum} />
              {collapsed ? (
                <button
                  className="text-left text-xs opacity-70 hover:opacity-100"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  + {props.authors.slice(authorCutoff).length} more
                </button>
              ) : null}
            </>
          ) : (
            <>
              {props.authors.length > 0 && hasContributions(props.authors) ? (
                <AuthorDistFragment show={true} items={props.authors} contribSum={props.contribSum} />
              ) : (
                <p>No authors found</p>
              )}
            </>
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

function hasContributions(authors?: {author: string, contribs: number}[]) {
  if (!authors) return false
  for (const {contribs} of authors) {
    if (contribs > 0) return true
  }
  return false
}

function calculateAuthorshipForSubTree(tree: HydratedGitTreeObject) {
  const aggregatedAuthors: Record<string, number> = {}
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
    for (const child of tree.children) {
      if (child.type === "blob") {
        const unionedAuthors = child.unionedAuthors
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
