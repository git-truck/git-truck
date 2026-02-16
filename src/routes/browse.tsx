import { Await, Form, Link, redirect, href, useLoaderData, useLocation, useNavigation, useSubmit } from "react-router"
import { Code } from "~/components/util"
import type { ReactNode } from "react"
import { Suspense, Fragment, useRef, startTransition } from "react"
import { cn } from "~/styling"
import { join } from "node:path"
import { getArgsWithDefaults, normalizeAndResolvePath } from "~/shared/util.server.ts"
import { Icon } from "~/components/Icon"
import {
  mdiSortAscending,
  mdiSortDescending,
  mdiArrowRight,
  mdiArrowLeft,
  mdiSort,
  mdiSourceRepository,
  mdiFolder,
  mdiCheckboxBlank,
  mdiCheckboxMarked
} from "@mdi/js"
import InstanceManager from "~/analyzer/InstanceManager.server"
import { existsSync } from "node:fs"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/browse"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { GitCaller } from "~/analyzer/git-caller.server"
import { versionContext } from "~/root"
import { Breadcrumb } from "~/components/Breadcrumb"
import { useKey } from "~/hooks"
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server"
import { createSerializer, parseAsBoolean, parseAsNumberLiteral, useQueryStates } from "nuqs"
import { readdir } from "node:fs/promises"
import { iconToURL, normalizePath, promiseHelper } from "~/shared/util"

const DEFAULT_COUNT = 10
const DEFAULT_OFFSET = 0
const COUNT_OPTIONS = [10, 25, 50, 100]

export const browseSearchParamsConfig = {
  path: parseAsString.withOptions({ shallow: false }),
  count: parseAsNumberLiteral(COUNT_OPTIONS).withOptions({ shallow: false }).withDefault(DEFAULT_COUNT),
  offset: parseAsInteger.withOptions({ shallow: false }).withDefault(DEFAULT_OFFSET),
  sort: parseAsStringLiteral(["most-recent", "least-recent", "asc", "desc"])
    .withOptions({ shallow: false })
    .withDefault("most-recent"),
  search: parseAsString
    .withOptions({
      shallow: false,
      limitUrlUpdates: {
        method: "throttle",
        timeMs: 1000
      }
    })
    .withDefault(""),
  "hide-dirs": parseAsBoolean.withDefault(false)
}
const loadSearchParams = createLoader(browseSearchParamsConfig)
export const browseSerializer = createSerializer(browseSearchParamsConfig)
const args = getArgsWithDefaults()

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  log.info("Browse loader triggered")
  const {
    path: rawPath,
    count,
    offset,
    sort,
    search,
    "hide-dirs": hideDirs
  } = loadSearchParams(request, { strict: true })

  const path = rawPath ? normalizeAndResolvePath(rawPath, { resolveSegments: true }) : null

  const emptyResponse = {
    versionInfo: context.get(versionContext),
    directories: [],
    analyzedReposPromise: Promise.resolve([]),
    totalCount: 0
  }

  if (path) {
    if (!existsSync(path)) {
      log.warn(`Path not found: ${path}`)
      return {
        ...emptyResponse,
        error: "Path not found",
        parentDirectoryPath: path,
        analyzedReposPromise: Promise.resolve([]),
        totalCount: 0
      }
    }
    args.path = path
  }

  const parentDirectoryIsRepository = existsSync(join(args.path, ".git"))

  if (parentDirectoryIsRepository) {
    log.info("Parent directory is a repository, redirecting to view")
    throw redirect(href("/view") + browseSerializer({ path: args.path }))
  }

  const parentDirectory = args.path

  // Get all directories that has a .git subdirectory and sort them by last changed date
  log.time("Read directories")
  const [dirEntries, error] = await promiseHelper(readdir(parentDirectory, { withFileTypes: true }))
  if (error) {
    return {
      ...emptyResponse,
      parentDirectoryPath: parentDirectory,
      error: error.message.startsWith("EPERM")
        ? "Permission denied"
        : error.message.startsWith("EACCES")
          ? "Access denied"
          : error.message.startsWith("ENOTDIR")
            ? "Not a directory"
            : error.message || "Failed to read directory entries"
    }
  }
  const rawEntries = dirEntries.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))

  const filteredEntries = rawEntries
    .map((entry) => ({
      name: entry.name,
      directoryPath: join(parentDirectory, entry.name),
      hasGitDirectory: existsSync(join(parentDirectory, entry.name, ".git"))
    }))
    .filter((repo) => repo.name.toLowerCase().includes(search.toLowerCase()) && (!hideDirs || repo.hasGitDirectory))

  const sortByLastChanged = sort === "least-recent" || sort === "most-recent"

  // If we need to sort by lastChanged, it needs to be prefetched for all entries
  const entriesWithLastChanged = sortByLastChanged
    ? await Promise.all(
        filteredEntries.map(async (entry) => {
          const [lastChanged] = entry.hasGitDirectory
            ? ((await promiseHelper(GitCaller.getLastChanged(entry.directoryPath))) ?? [0])
            : [null]

          return { ...entry, lastChanged }
        })
      )
    : // Otherwise, we can skip it and load results faster
      filteredEntries.map((entry) => ({ ...entry, lastChanged: null as number | null }))

  const sortedEntries = entriesWithLastChanged.sort((a, b) => {
    if (sort === "asc") return a.name.localeCompare(b.name)
    if (sort === "desc") return b.name.localeCompare(a.name)
    if (sort === "least-recent") return (a.lastChanged ?? 0) - (b.lastChanged ?? 0)
    // default: most-recent (most recent first)
    return (b.lastChanged ?? 0) - (a.lastChanged ?? 0)
  })

  const pagedEntries = sortedEntries.slice(offset, offset + count)

  const directories: Array<
    {
      name: string
      path: string
      status: "Loading" | "Success" | "Error"
      parentDirectoryPath: string
      lastChanged: number | null
    } & ({ type: "directory" } | { type: "repository"; branch: string | null; hash: string | null })
  > = await Promise.all(
    pagedEntries.map(async (entry) => {
      if (!entry.hasGitDirectory) {
        return {
          name: entry.name,
          type: "directory",
          path: entry.directoryPath,
          status: "Success" as const,
          parentDirectoryPath: parentDirectory,
          lastChanged: null
        } as const
      }

      const [branch] = await promiseHelper(GitCaller._getRepositoryHead(entry.directoryPath))
      const [hash] = branch ? await promiseHelper(GitCaller._revParse(entry.directoryPath, branch)) : [null]
      const [lastChanged] =
        entry.lastChanged !== null
          ? [entry.lastChanged]
          : ((await promiseHelper(GitCaller.getLastChanged(entry.directoryPath))) ?? [0])

      return {
        name: entry.name,
        type: "repository",
        path: entry.directoryPath,
        status: branch && hash && lastChanged ? "Success" : ("Error" as const),
        parentDirectoryPath: parentDirectory,
        branch,
        hash,
        lastChanged
      } as const
    })
  )

  log.timeEnd("Read directories")

  const analyzedReposPromise = InstanceManager.getOrCreateMetadataDB().getCompletedRepos()

  return {
    error: null,
    versionInfo: context.get(versionContext),
    directories,
    parentDirectoryPath: parentDirectory,
    analyzedReposPromise,
    totalCount: filteredEntries.length
  }
}

export default function Index() {
  const { error, versionInfo, directories, parentDirectoryPath, analyzedReposPromise, totalCount } =
    useLoaderData<typeof loader>()
  const location = useLocation()
  const navigation = useNavigation()
  const [{ "hide-dirs": hideDirs, sort: sortMethod, search: searchQuery }, setSearchParams] =
    useQueryStates(browseSearchParamsConfig)

  const searchFieldRef = useRef<HTMLInputElement>(null)

  useKey({ key: "f", ctrlOrMeta: true }, (event) => {
    event.preventDefault()
    searchFieldRef.current?.focus()
  })

  const submit = useSubmit()

  return (
    <div className="mx-auto grid max-w-(--breakpoint-2xl) gap-2 p-2 lg:grid-cols-[var(--spacing-sidepanel)_1fr_var(--spacing-sidepanel)]">
      <aside className="flex flex-col">
        <div className="card sticky top-2">
          <GitTruckInfo installedVersion={versionInfo.installedVersion} latestVersion={versionInfo.latestVersion} />
        </div>
      </aside>
      <main className="card">
        <div className="flex flex-col gap-2">
          <Form
            className="grid grid-flow-col grid-cols-[1fr_1fr_1fr] grid-rows-[auto_auto_auto] gap-2 p-2"
            onChange={(evt) => submit(evt.currentTarget)}
          >
            <label className="label" htmlFor="search">
              Search
            </label>
            {/* TODO: Clear search query when search query param updates */}
            <input
              id="search"
              ref={searchFieldRef}
              name="search"
              onChange={(evt) => {
                evt.stopPropagation()
                if (!evt.target.checkValidity()) {
                  return
                }
                startTransition(() => {
                  setSearchParams((prev) => ({ ...prev, search: evt.currentTarget.value }))
                })
              }}
              type="search"
              className="input"
              placeholder={`Search ${hideDirs ? "repositories" : "directories"}...`}
              defaultValue={searchQuery}
            />
            <div />
            <label className="label" htmlFor="path">
              Path
            </label>
            <input
              key={parentDirectoryPath}
              name="path"
              id="path"
              defaultValue={parentDirectoryPath}
              title="Browse path"
              placeholder="Path to browse"
              className="input"
              onBlur={(evt) => {
                if (evt.currentTarget.value !== parentDirectoryPath) {
                  evt.currentTarget.value = normalizePath(evt.currentTarget.value)
                  submit(evt.currentTarget.form!)
                }
              }}
              onChange={(evt) => {
                evt.stopPropagation()
              }}
              onKeyDown={(evt) => {
                if (evt.key === "Enter") {
                  evt.currentTarget.value = normalizePath(evt.currentTarget.value)
                  submit(evt.currentTarget.form!)
                }
              }}
            />
            {error ? (
              <output className="truncate text-sm text-red-600 dark:text-red-400" title={error}>
                {error}
              </output>
            ) : (
              <output />
            )}
            <label htmlFor="hide-dirs" className="label w-max">
              Exclude directories
            </label>
            <div className="flex cursor-pointer items-center gap-2 select-none">
              <label htmlFor="hide-dirs">
                <input
                  type="checkbox"
                  id="hide-dirs"
                  value="true"
                  className="peer sr-only"
                  name="hide-dirs"
                  defaultChecked={hideDirs ?? undefined}
                />
                <Icon path={mdiCheckboxBlank} size={1} className="peer-checked:hidden" />
                <Icon path={mdiCheckboxMarked} size={1} className="hidden peer-checked:block" />
              </label>
            </div>
            <div />
            <div />
            <Link
              to={`/clear-cache?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              className="btn btn--danger max-w-min justify-self-end"
            >
              Clear cache
            </Link>
          </Form>
        </div>
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
          <Breadcrumb className="justify-self-start" />
          <Pagination
            classNames={["justify-self-center text-sm", "justify-self-end text-sm"]}
            totalCount={totalCount}
          />
        </div>
        <RepositoryList
          className={cn({
            "opacity-80": navigation.state !== "idle"
          })}
        >
          <SortHeader
            label="Name"
            isActive={sortMethod === "asc" || sortMethod === "desc"}
            direction={sortMethod === "desc" ? "desc" : sortMethod === "asc" ? "asc" : undefined}
            onClick={() => setSearchParams((prev) => ({ ...prev, sort: sortMethod === "asc" ? "desc" : "asc" }))}
            title="Sort by name"
          />

          <SortHeader
            label="Last Changed"
            isActive={sortMethod === "least-recent" || sortMethod === "most-recent"}
            direction={sortMethod === "most-recent" ? "asc" : sortMethod === "least-recent" ? "desc" : undefined}
            onClick={() =>
              setSearchParams((prev) => ({
                ...prev,
                sort: sortMethod === "most-recent" ? "least-recent" : "most-recent"
              }))
            }
            title={`Sort by ${sortMethod === "least-recent" ? "most" : "least"} recent (slower than sorting by name)`}
          />
          {directories.map((repo, i) => (
            <Suspense
              key={directories[i].path}
              fallback={<RepositoryEntry repo={{ ...repo, status: "Loading" }} status="Loading" isAnalyzed={false} />}
            >
              <Await resolve={analyzedReposPromise}>
                {(analyzedRepos) =>
                  repo !== null ? (
                    <RepositoryEntry
                      key={repo.path}
                      repo={repo}
                      status="Success"
                      isAnalyzed={
                        repo.type === "repository"
                          ? analyzedRepos.find((ar) => ar.hash === repo.hash) !== undefined
                          : false
                      }
                    />
                  ) : null
                }
              </Await>
            </Suspense>
          ))}
        </RepositoryList>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center pl-2">
          <p className="text-sm">
            {directories.length} {directories.length < totalCount ? `of ${totalCount}` : ""}{" "}
            {(directories.length < totalCount && totalCount !== 1) || directories.length !== 1
              ? hideDirs
                ? "repositories"
                : "directories"
              : hideDirs
                ? "repository"
                : "directory"}
          </p>
          <Pagination
            classNames={["justify-self-center text-sm", "justify-self-end text-sm"]}
            totalCount={totalCount}
          />
        </div>
      </main>
    </div>
  )
}

type SortDirection = "asc" | "desc" | undefined

function SortHeader({
  label,
  isActive,
  direction,
  onClick,
  icon,
  title
}: {
  label: string
  isActive: boolean
  direction: SortDirection
  onClick: () => void
  icon?: string
  title?: string
}) {
  const sortIcon = icon ?? (direction === "asc" ? mdiSortAscending : direction === "desc" ? mdiSortDescending : mdiSort)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title={title ?? `Sort by ${label}`}
      className={cn(
        "text-secondary-text dark:text-secondary-text-dark/50 hover:text-primary hover:dark:text-primary text-sm leading-none font-semibold tracking-wider uppercase transition-colors",
        "hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 cursor-pointer rounded px-2 py-1 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white",
        {
          "text-primary dark:text-primary": isActive
        }
      )}
    >
      <span className="flex items-center gap-1 leading-none">
        <span className="leading-none">{label}</span>
        <Icon path={sortIcon} size={0.75} className="shrink-0" />
      </span>
    </button>
  )
}

function RepositoryList({ children, className }: { children: ReactNode[]; className?: string }) {
  return children.length === 0 ? (
    <>
      <p>
        Try running <Code inline>git-truck</Code> in another folder or provide another path as argument.
      </p>
    </>
  ) : (
    <div
      className={cn(
        "row-start-auto grid w-full grid-flow-row grid-cols-[1fr_auto] flex-wrap items-center gap-2",
        className
      )}
    >
      {/* TODO: Add support for cloning */}
      {/* <h2 className="card__title truncate break-all" title="Clone repository">
        Clone repository
      </h2>
      <span className="select-none rounded-full bg-linear-to-r  from-blue-500 to-blue-600 px-2 py-1.5 text-center text-xs font-bold uppercase leading-none tracking-widest text-white/90">
        Coming soon
      </span>
      <input type="text" className="input" placeholder="git@github.com/owner/repo.git" />

      <button className="btn rounded-full" disabled title="Coming soon!">
        Clone
      </button>
      <hr className="col-span-full" /> */}
      {children}
    </div>
  )
}

function RepositoryEntry({
  repo: entry,
  status,
  isAnalyzed
}: {
  repo: Awaited<ReturnType<typeof loader>>["directories"][0]
  status: "Success" | "Loading" | "Error"
  isAnalyzed: boolean
}): ReactNode {
  const isFolder = false
  const [{ search: _, ...searchParams }] = useQueryStates(browseSearchParamsConfig)
  const serialize = createSerializer(browseSearchParamsConfig)
  return (
    <Fragment key={entry.path}>
      <Link
        to={href(entry.type === "directory" ? "/browse" : "/view") + serialize({ ...searchParams, path: entry.path })}
        prefetch="none"
        aria-disabled={!isFolder && status === "Error"}
        className={cn(
          "col-span-2 block w-full rounded px-2 py-1 transition-colors",
          "hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 cursor-pointer",
          {
            "pointer-events-none": !isFolder && status === "Error"
          }
        )}
        title={entry.path}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {entry.type === "directory" ? (
              <Icon path={mdiFolder} size={1} />
            ) : (
              <div
                className={cn(
                  "size-6 shrink-0 bg-linear-to-bl",
                  status === "Error"
                    ? "from-red-500 to-red-600"
                    : status === "Loading"
                      ? "from-yellow-500 to-yellow-600"
                      : isAnalyzed
                        ? "from-green-500 to-green-600"
                        : "from-gray-500 to-gray-400",
                  status === "Loading" && "animate-pulse"
                )}
                style={{
                  maskImage: iconToURL(mdiSourceRepository),
                  maskRepeat: "no-repeat",
                  maskSize: "100% 100%"
                }}
                title={
                  status === "Error"
                    ? "Error"
                    : status === "Loading"
                      ? "Loading"
                      : isAnalyzed
                        ? "Analyzed"
                        : "Not analyzed yet"
                }
              />
            )}

            <span className="truncate text-base font-medium">{entry.name}</span>
          </div>
          <span className="text-secondary-text dark:text-secondary-text-dark text-sm">
            {status === "Error" || !entry.lastChanged ? "-" : new Date(entry.lastChanged * 1000).toLocaleDateString()}
          </span>
        </div>
      </Link>
      <hr className="col-span-full opacity-50 last:hidden" />
    </Fragment>
  )
}

// TODO: Pagination is bugged (due to being uncontrolled, same goes for search field)
function Pagination({ classNames, totalCount }: { classNames?: [string, string]; totalCount: number }) {
  const [{ path, count, offset, ...rest }, setSearchParams] = useQueryStates(browseSearchParamsConfig, {
    shallow: false
  })

  const serialize = createSerializer(browseSearchParamsConfig)

  const pages = Math.max(Math.ceil(totalCount / count), 1)
  const currentPage = Math.floor(offset / count) + 1

  return (
    <>
      <div className={cn("flex items-center gap-2", classNames?.[0])}>
        <Link
          className={cn("btn", {
            invisible: offset - count < 0
          })}
          aria-disabled={offset - count < 0}
          to={
            href("/browse") +
            serialize({
              ...rest,
              path,
              offset: Math.max(0, offset - count),
              count: count
            })
          }
          title="Previous page"
        >
          <Icon path={mdiArrowLeft} />
        </Link>

        <span className="whitespace-pre">
          Page {currentPage} of {pages}
        </span>
        <Link
          className={cn("btn", {
            invisible: offset + count >= totalCount
          })}
          aria-disabled={offset + count >= totalCount}
          to={
            href("/browse") +
            serialize({
              ...rest,
              path: path,
              offset: offset + count,
              count: count
            })
          }
          title="Next page"
        >
          <Icon path={mdiArrowRight} />
        </Link>
      </div>

      <div className={cn("", classNames?.[1])}>
        <label className="flex items-center gap-2 whitespace-pre">
          Per page
          <select
            defaultValue={count}
            className="input"
            onChange={(evt) =>
              setSearchParams({
                count: Number(evt.target.value),
                offset: 0 // Reset to first page when changing count
              })
            }
          >
            {COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  )
}
