import { Await, Form, Link, redirect, href, useLoaderData, useLocation } from "react-router"
import { Code } from "~/components/util"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import type { ReactNode } from "react"
import { Suspense, Fragment, useRef } from "react"
import { cn } from "~/styling"
import { join, resolve } from "node:path"
import { getArgsWithDefaults, getRepoNameFromPath } from "~/shared/util.server.ts"
import { Icon } from "~/components/Icon"
import {
  mdiSortAscending,
  mdiSortDescending,
  mdiArrowRight,
  mdiArrowLeft,
  mdiSort
} from "@mdi/js"
import InstanceManager from "~/analyzer/InstanceManager.server"
import { existsSync } from "node:fs"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/browse"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { GitCaller } from "~/analyzer/git-caller.server"
import { inspect } from "~/shared/util"
import { versionContext } from "~/root"
import { Breadcrumb } from "~/components/Breadcrumb"
import { useKey } from "~/hooks"
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server"
import { createSerializer, parseAsNumberLiteral, useQueryState, useQueryStates } from "nuqs"

const DEFAULT_COUNT = 25
const DEFAULT_OFFSET = 0

const COUNT_OPTIONS = [10, 25, 50, 100]
const browseSearchParamsConfig = {
  path: parseAsString.withOptions({ shallow: false }),
  count: parseAsNumberLiteral(COUNT_OPTIONS).withOptions({ shallow: false }).withDefault(DEFAULT_COUNT),
  offset: parseAsInteger.withOptions({ shallow: false }).withDefault(DEFAULT_OFFSET),
  sort: parseAsStringLiteral(["most-recent", "least-recent", "asc", "desc"])
    .withOptions({ shallow: false })
    .withDefault("most-recent"),
  search: parseAsString.withOptions({ shallow: false }).withDefault("")
}
const loadSearchParams = createLoader(browseSearchParamsConfig)

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const serializer = createSerializer(browseSearchParamsConfig)
  const args = getArgsWithDefaults()
  const { path, count, offset, sort } = loadSearchParams(request, { strict: true })

  if (path) {
    log.info(`Path provided: ${path}`)
    if (existsSync(path)) {
      log.warn(`Path exists, overwriting: ${path}`)
      args.path = path
    } else {
      log.warn(`Path does not exists: ${path}, using default path: ${args.path}`)
    }
  }

  const baseDirIsRepo = existsSync(join(args.path, ".git"))

  if (baseDirIsRepo) {
    throw redirect(href("/view/home") + serializer({ path: resolve(args.path) }))
  }

  const baseDir = resolve(args.path)

  // Get all directories that has a .git subdirectory
  const foundRepositories = await GitCaller.readGitRepos(baseDir)
  const repositories = foundRepositories
    .sort((a, b) => {
      if (sort === "asc") return a.name.localeCompare(b.name)
      if (sort === "desc") return b.name.localeCompare(a.name)
      if (sort === "least-recent") return a.lastChanged - b.lastChanged
      // default: most-recent (most recent first)
      return b.lastChanged - a.lastChanged
    })
    .slice(offset, offset + count)

  // Get metadata for all repos in parallel
  // Returns an object, as `defer` does not support arrays
  // The keys are prefixed with an underscore to avoid conflicts with other properties returned from the loader
  // const repositoryPromises = {} as Record<string, Promise<Repository | null>>
  // const repositoryPromises = Object.fromEntries(
  //   repositories.map((repo) => [`_${repo.path}`, GitCaller.getRepoMetadata(repo.path, repo.lastChanged)])
  // )

  const analyzedReposPromise = InstanceManager.getOrCreateMetadataDB().getCompletedRepos()

  return {
    versionInfo: context.get(versionContext),
    repositories,
    baseDir,
    baseDirName: getRepoNameFromPath(baseDir),
    analyzedReposPromise,
    totalCount: foundRepositories.length
  }
}

export default function Index() {
  const { versionInfo, repositories, baseDir, analyzedReposPromise, totalCount } = useLoaderData<typeof loader>()
  const location = useLocation()
  const [sortMethod, setSortMethod] = useQueryState("sort", browseSearchParamsConfig.sort)
  const [_, setSearch] = useQueryState("search", browseSearchParamsConfig.search)

  // const sortMethod = (searchParams.get("sort") as SortingMethod | null) ?? "lastChanged"

  const searchFieldRef = useRef<HTMLInputElement>(null)

  useKey({ key: "f", ctrl: true }, (event) => {
    event.preventDefault()
    searchFieldRef.current?.focus()
  })

  return (
    <div className="grid gap-2 lg:grid-cols-[var(--spacing-sidepanel)_1fr_var(--spacing-sidepanel)]">
      <aside className="flex flex-col p-2">
        <div className="grow"> </div>
        <div className="card">
          <GitTruckInfo installedVersion={versionInfo.installedVersion} latestVersion={versionInfo.latestVersion} />
        </div>
      </aside>
      <main className="flex min-h-screen flex-col gap-4 p-4 lg:col-span-2 xl:col-span-1">
        <div className="card">
          <div className="flex flex-col gap-1">
            <div className="flex w-full items-center justify-between gap-2">
              <Breadcrumb />

              <Link
                to={`/clear-cache?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                className="btn btn--danger btn--text max-w-min"
              >
                Clear cache
              </Link>
            </div>
            <div className="flex flex-wrap items-stretch gap-2">
              <input
                ref={searchFieldRef}
                onChange={(evt) => {
                  // startTransition(() => {
                  setSearch(evt.target.value)
                  // })
                }}
                type="text"
                className="input"
                placeholder="Search repositories..."
              />
            </div>
            <div className="hidden w-full gap-2">
              <Form method="get" className="flex grow gap-1">
                <input
                  className="input"
                  key={baseDir}
                  name="path"
                  defaultValue={baseDir}
                  required
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.currentTarget.form?.submit()
                    }
                  }}
                />
                <button className="btn btn--primary">Browse</button>
              </Form>
            </div>
          </div>
          {repositories.length > 0 ? (
            <RepositoryList>
              <SortHeader
                label="Repository"
                isActive={sortMethod === "asc" || sortMethod === "desc"}
                direction={sortMethod === "desc" ? "desc" : sortMethod === "asc" ? "asc" : undefined}
                onClick={() => setSortMethod(sortMethod === "asc" ? "desc" : "asc")}
                // icon={
                //   sortMethod === "asc"
                //     ? mdiSortAlphabeticalAscendingVariant
                //     : sortMethod === "desc"
                //       ? mdiSortAlphabeticalDescendingVariant
                //       : mdiSortAlphabeticalVariant
                // }
                title="Sort by name"
              />

              <SortHeader
                label="Last Changed"
                isActive={sortMethod === "least-recent" || sortMethod === "most-recent"}
                direction={sortMethod === "most-recent" ? "asc" : sortMethod === "least-recent" ? "desc" : undefined}
                onClick={() => setSortMethod(sortMethod === "most-recent" ? "least-recent" : "most-recent")}
                // icon={sortMethod === "most-recent" ? mdiSortClockDescendingOutline : mdiSortClockAscendingOutline}
                title={`Click to sort by ${sortMethod === "least-recent" ? "most" : "least"} recent`}
              />
              {repositories.map((repo, i) => (
                <Suspense
                  key={repositories[i].path}
                  fallback={
                    <RepositoryEntry repo={{ ...repo, status: "Loading" }} status="Loading" isAnalyzed={false} />
                  }
                >
                  <Await resolve={analyzedReposPromise}>
                    {(analyzedRepos) =>
                      repo !== null ? (
                        <RepositoryEntry
                          key={repo.path}
                          repo={repo}
                          status="Success"
                          isAnalyzed={inspect(analyzedRepos).find((ar) => ar.repo === repo.name) !== undefined}
                        />
                      ) : null
                    }
                  </Await>
                </Suspense>
              ))}
            </RepositoryList>
          ) : (
            <div className="card w-full place-items-center">
              <h2 className="text-2xl font-bold">This looks empty...</h2>
              <p>Try running Git Truck in another folder</p>
              <LoadingIndicator />
            </div>
          )}
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 text-sm *:self-center first:self-start last:justify-self-end">
            <p className="flex gap-2 justify-self-start">
              {repositories.length} {repositories.length < totalCount ? `of ${totalCount}` : ""}{" "}
              {(repositories.length < totalCount && totalCount !== 1) || repositories.length !== 1
                ? "repositories"
                : "repository"}
            </p>
            <Pagination classNames={["justify-self-center", "justify-self-end"]} totalCount={totalCount} />
          </div>
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

function RepositoryList({ children }: { children: ReactNode[] }) {
  return children.length === 0 ? (
    <>
      <p>
        Try running <Code inline>git-truck</Code> in another folder or provide another path as argument.
      </p>
    </>
  ) : (
    <div className="row-start-auto grid w-full grid-flow-row grid-cols-[1fr_auto] flex-wrap items-center gap-2">
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
  repo: Awaited<ReturnType<typeof GitCaller.readGitRepos>>[0]
  status: "Success" | "Loading" | "Error"
  isAnalyzed: boolean
}): ReactNode {
  const isFolder = false
  const serialize = createSerializer(browseSearchParamsConfig)

  return (
    <Fragment key={entry.path}>
      <Link
        to={href(isFolder ? "/browse" : "/view/home") + serialize({ path: entry.path })}
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
            <div
              className={cn(
                "aspect-square h-3 shrink-0 rounded-full",
                status === "Error"
                  ? "bg-linear-to-bl from-red-500 to-red-600"
                  : status === "Loading"
                    ? "animate-pulse bg-linear-to-bl from-yellow-500 to-yellow-600"
                    : isAnalyzed
                      ? "bg-linear-to-bl from-green-500 to-green-600"
                      : "bg-linear-to-bl from-gray-500 to-gray-400"
              )}
              title={
                status === "Error"
                  ? "Error"
                  : status === "Loading"
                    ? "Loading"
                    : isAnalyzed
                      ? "Analyzed"
                      : "Not analyzed"
              }
            />

            <span className="truncate text-base font-medium">{entry.name}</span>
          </div>
          <span className="text-secondary-text dark:text-secondary-text-dark text-sm">
            {status === "Error"
              ? "-"
              : entry.lastChanged === 0
                ? "-"
                : new Date(entry.lastChanged * 1000).toLocaleDateString("en-US")}
          </span>
        </div>
      </Link>
      <hr className="col-span-full opacity-50 last:hidden" />
    </Fragment>
  )
}

function Pagination({ classNames, totalCount }: { classNames?: [string, string]; totalCount: number }) {
  const [path] = useQueryState("path", browseSearchParamsConfig.path)
  const [{ count, offset }, setSearchParams] = useQueryStates(
    {
      offset: browseSearchParamsConfig.offset,
      count: browseSearchParamsConfig.count
    },
    { shallow: false }
  )

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
            className="input"
            onChange={(evt) =>
              setSearchParams({
                count: Number(evt.target.value),
                offset: 0 // Reset to first page when changing count
              })
            }
          >
            {COUNT_OPTIONS.map((option) => (
              <option key={option} value={option} selected={count === option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  )
}
