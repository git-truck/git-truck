import { dateFormatLong, extname, invariant, last, resolveParentFolder } from "~/shared/util"
import { useId, useState, Suspense, useEffect } from "react"
import { Await, Form, useLoaderData, useLocation, useNavigation, Link } from "react-router"
import { AuthorDistFragment } from "~/components/AuthorDistFragment"
import { ChevronButton } from "~/components/ChevronButton"
import { useData } from "~/contexts/DataContext"
import type { GitObject, GitTreeObject } from "~/shared/model"
import type { Route } from "./+types/view.details"
import { mdiEyeOffOutline, mdiAccountMultiple, mdiOpenInNew, mdiSearchWeb } from "@mdi/js"
import byteSize from "byte-size"
import { Icon } from "~/components/Icon"
import { useClickedObject } from "~/contexts/ClickedContext"
import { usePath } from "~/contexts/PathContext"
import { LegendDot } from "~/components/util"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { currentRepositoryContext, useRepoContext, viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import { openFile } from "~/shared/util.server"
import { useSetOpenCollapsibleHeader } from "~/components/CollapsibleHeader"
import { RepoTabs } from "~/components/RepoTabs"
import { useQueryStates } from "nuqs"

export function HydrateFallback() {
  return <div>Loading...</div>
}

const authorCutoff = 2

function hasContributions(authors?: { author: string; contribs: number }[] | null) {
  if (!authors) return false
  for (const { contribs } of authors) {
    if (contribs > 0) return true
  }
  return false
}
export const loader = async ({ request, context }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const objectPath = url.searchParams.get("objectPath")
  const { instance } = context.get(currentRepositoryContext)
  invariant(objectPath, "path is required")

  return {
    path: objectPath,
    authorDistributionPromise: instance.db.getAuthorContribsForPath(objectPath)
  }
}

export const action = async ({ request, context }: Route.ActionArgs) => {
  const { instance } = context.get(currentRepositoryContext)

  const formData = await request.formData()
  const ignorePath = formData.get("ignore") as string | null
  const unignorePath = formData.get("unignore") as string | null
  const openPath = formData.get("open") as string | null

  if (ignorePath && typeof ignorePath === "string") {
    instance.prevInvokeReason = "ignore"
    const hidden = await instance.db.getHiddenFiles()
    hidden.push(ignorePath)
    await instance.db.replaceHiddenFiles(hidden)

    return null
  }

  if (unignorePath && typeof unignorePath === "string") {
    instance.prevInvokeReason = "unignore"
    const hidden = await instance.db.getHiddenFiles()
    await instance.db.replaceHiddenFiles(hidden.filter((path) => path !== unignorePath))
    return null
  }

  if (typeof openPath === "string") {
    instance.prevInvokeReason = "open"
    openFile(instance.repositoryPath, openPath)
    return null
  }

  return null
}

export default function Details() {
  const { setPath } = usePath()
  const { showUnionAuthorsModal } = useRepoContext()
  const { path, authorDistributionPromise } = useLoaderData<typeof loader>()
  const data = useData()
  const { state } = useNavigation()
  const location = useLocation()
  const clickedObject = location.state?.clickedObject as GitObject | null | undefined
  const setOpen = useSetOpenCollapsibleHeader()

  const [viewSearchParams] = useQueryStates(viewSearchParamsConfig)
  const zoomLink = location.pathname + viewSerializer({ ...viewSearchParams, zoomPath: path })

  useEffect(() => {
    setOpen(!!clickedObject)
  }, [clickedObject, setOpen])

  if (!clickedObject) {
    return <p className="p-4">No file or folder selected</p>
  }

  const commitCount = data.databaseInfo.commitCounts[path]
  const isBlob = clickedObject.type === "blob"

  const extension = last(clickedObject.name.split("."))
  return (
    <>
      <RepoTabs />
      <div className="flex grow flex-col gap-2">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {isBlob ? <FileTypeEntry /> : null}
          {isBlob ? <CommitsEntry count={commitCount ?? 0} /> : null}
          {isBlob ? (
            <>
              <SizeEntry size={clickedObject.sizeInBytes} isBinary={false} />
              <LastchangedEntry epoch={data.databaseInfo.lastChanged[path]} />
            </>
          ) : (
            <FileAndSubfolderCountEntries clickedTree={clickedObject} />
          )}
          <PathEntry path={clickedObject.path} />
        </div>
        <div className="card">
          <Suspense fallback={<p>Loading authors...</p>}>
            <Await resolve={authorDistributionPromise}>
              {(authorDistribution) => <AuthorDistribution authorDistribution={authorDistribution} />}
            </Await>
          </Suspense>
        </div>
      </div>
      <button className="btn" onClick={showUnionAuthorsModal}>
        <Icon path={mdiAccountMultiple} />
        Group authors
      </button>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className="btn" to={zoomLink}>
          <Icon path={mdiSearchWeb} />
          Zoom to this {isBlob ? "file" : "folder"}
        </Link>
        {isBlob ? (
          <>
            <Form className="w-max" method="post">
              <input type="hidden" name="ignore" value={clickedObject.path} />
              <button className="btn" type="submit" disabled={state !== "idle"} title="Hide this file">
                <Icon path={mdiEyeOffOutline} />
                Hide
              </button>
            </Form>
            {clickedObject.name.includes(".") ? (
              <Form className="w-max" method="post">
                <input type="hidden" name="ignore" value={`*.${extension}`} />
                <button
                  className="btn"
                  type="submit"
                  disabled={state !== "idle"}
                  title={`Hide all files with .${extension} extension`}
                >
                  <Icon path={mdiEyeOffOutline} />
                  <span>Hide *.{extension}</span>
                </button>
              </Form>
            ) : null}
          </>
        ) : (
          <Form method="post" action={location.pathname}>
            <input type="hidden" name="ignore" value={clickedObject.path} />
            <button
              className="btn"
              type="submit"
              disabled={state !== "idle"}
              onClick={() => {
                setPath(resolveParentFolder(path))
              }}
            >
              <Icon path={mdiEyeOffOutline} />
              Hide this folder
            </button>
          </Form>
        )}
      </div>
    </>
  )
}

function AuthorDistribution({ authorDistribution }: { authorDistribution: { author: string; contribs: number }[] }) {
  const authorDistributionExpandId = useId()
  const [collapsed, setCollapsed] = useState<boolean>(true)

  const authorsAreCutoff = (authorDistribution?.length ?? 0) > authorCutoff + 1
  const contribSum = !authorDistribution ? 0 : authorDistribution.reduce((acc, curr) => acc + curr.contribs, 0)

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex justify-between ${authorsAreCutoff ? "hover:text-secondary-text dark:hover:text-secondary-text-dark cursor-pointer" : ""}`}
      >
        <label className="label grow" htmlFor={authorDistributionExpandId}>
          <h3 className="font-bold">Author distribution</h3>
        </label>
        {authorsAreCutoff ? (
          <ChevronButton id={authorDistributionExpandId} open={!collapsed} onClick={() => setCollapsed(!collapsed)} />
        ) : null}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-center gap-1">
        {authorsAreCutoff ? (
          <>
            <AuthorDistFragment show items={authorDistribution.slice(0, authorCutoff)} contribSum={contribSum} />
            <AuthorDistFragment
              show={!collapsed}
              items={authorDistribution.slice(authorCutoff)}
              contribSum={contribSum}
            />
            {collapsed ? (
              <button
                className="cursor-pointer text-left text-xs opacity-70 hover:opacity-100"
                onClick={() => setCollapsed(!collapsed)}
              >
                + {(authorDistribution?.slice(authorCutoff) ?? []).length} more
              </button>
            ) : null}
          </>
        ) : (
          <>
            {(authorDistribution ?? []).length > 0 && hasContributions(authorDistribution) ? (
              <AuthorDistFragment show items={authorDistribution ?? []} contribSum={contribSum} />
            ) : (
              <p>No authors found</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FileTypeEntry() {
  const { clickedObject } = useClickedObject()

  return (
    <>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Type
      </div>
      <div className="flex gap-1 text-sm">{clickedObject ? extname(clickedObject.path) : "N/A"}</div>
    </>
  )
}

function CommitsEntry(props: { count: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Commits
      </div>
      <p className="text-sm break-all">{props.count ?? "unknown"}</p>
    </>
  )
}

function LastchangedEntry(props: { epoch: number | undefined }) {
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Last changed
      </div>
      <p className="text-sm break-all">{props.epoch ? dateFormatLong(props.epoch) : "unknown"}</p>
    </>
  )
}

function PathEntry(props: { path: string }) {
  const { state } = useNavigation()
  const { clickedObject } = useClickedObject()
  if (!clickedObject) return null
  return (
    <>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Located at
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center justify-between gap-2 text-sm break-all">
        <p className="truncate" title={props.path}>
          {props.path}
        </p>
        <Form method="post" action={location.pathname}>
          <input type="hidden" name="open" value={clickedObject.path} />
          <button
            className="btn--icon"
            disabled={state !== "idle"}
            title={clickedObject.type === "blob" ? "Open file in default app" : "Browse folder in system explorer"}
          >
            <Icon path={mdiOpenInNew} size="1.25em" className="w-max" />
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
      <div className="flex items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">Size</div>
      <p className="text-sm break-all">
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

function FileAndSubfolderCountEntries(props: { clickedTree: GitTreeObject }) {
  const folderCount = props.clickedTree.children.filter((child) => child.type === "tree").length
  const fileCount = props.clickedTree.children.length - folderCount

  return (
    <>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Files
      </div>
      <p className="text-sm break-all">{fileCount}</p>
      <div className="flex grow items-center overflow-hidden text-sm font-semibold text-ellipsis whitespace-pre">
        Folders
      </div>
      <p className="text-sm break-all">{folderCount}</p>
    </>
  )
}
