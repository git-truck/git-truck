import { Await, Form, Link, useFetcher, useLoaderData, useSearchParams } from "react-router"
import { Code } from "~/components/util"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import type { ReactNode } from "react"
import { Suspense, Fragment, startTransition } from "react"
import { cn } from "~/styling"
import { join, resolve } from "node:path"
import { getArgsWithDefaults, getBaseDirFromPath, getRepoNameFromPath } from "~/shared/util.server.ts"
import { Icon } from "~/components/Icon"
import {
  mdiArrowUp,
  mdiClockOutline,
  mdiSortAscending,
  mdiSortDescending,
  mdiFolder,
  mdiArrowRight,
  mdiArrowLeft
} from "@mdi/js"
import InstanceManager from "~/analyzer/InstanceManager.server"
import { existsSync } from "node:fs"
import { log } from "~/analyzer/log.server"
import type { Route } from "./+types/browse"
import { GitTruckInfo } from "~/components/GitTruckInfo"
import { GitCaller } from "~/analyzer/git-caller.server"
import { getPathFromRepoAndHead } from "~/shared/util"
import { versionContext } from "./view"

const DEFAULT_COUNT = 10
const DEFAULT_OFFSET = 0

export const loader = async ({ context, request }: Route.LoaderArgs) => {
  const queryPath = null
  const args = getArgsWithDefaults()
  const searchParams = new URL(request.url).searchParams
  const count = Number(searchParams.get("count") ?? DEFAULT_COUNT.toString())
  const offset = Number(searchParams.get("offset") ?? DEFAULT_OFFSET.toString())
  const sort = searchParams.get("sort")
  const sortMethod = (sort as "lastChanged" | "nameAsc" | "nameDesc" | null) ?? "lastChanged"

  if (queryPath) {
    log.info(`Path provided: ${queryPath}`)
    if (existsSync(queryPath)) {
      log.warn(`Path exists, overwriting: ${queryPath}`)
      args.path = queryPath
    } else {
      log.warn(`Path does not exists: ${queryPath}`)
    }
  }

  const baseDirIsRepo = existsSync(join(args.path, ".git"))

  const baseDir = resolve(
    baseDirIsRepo ? getBaseDirFromPath(args.path) : args.path
    // TODO: Implement browsing, requires new routing
    // args.path
  )

  // Get all directories that has a .git subdirectory
  const foundRepositories = await GitCaller.readGitRepos(baseDir)
  const repositories = foundRepositories
    .sort((a, b) => {
      if (sortMethod === "nameAsc") {
        return a.name.localeCompare(b.name)
      } else if (sortMethod === "nameDesc") {
        return b.name.localeCompare(a.name)
      } else {
        return b.lastChanged - a.lastChanged
      }
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

export const action = async ({ request }: Route.ActionArgs) => {
  const baseDir = new URL(request.url).searchParams.get("path")

  log.info(`Checking path: ${baseDir}`)

  if (!baseDir) {
    return {
      ok: false,
      message: "No path provided"
    }
  }

  const dirExists = existsSync(baseDir)

  if (!dirExists) {
    return {
      ok: false,
      message: "Path does not exist"
    }
  }

  return {
    ok: true,
    message: null
  }
}

type SortingMethod = "lastChanged" | "nameAsc" | "nameDesc"

export default function Index() {
  const { versionInfo, repositories, baseDir, analyzedReposPromise, totalCount } = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  const fetcher = useFetcher<typeof action>()
  const sortMethod = (searchParams.get("sort") as SortingMethod | null) ?? "lastChanged"
  const setSortMethod = (method: SortingMethod) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      newParams.set("sort", method)
      return newParams
    })
  }

  return (
    <main className="app-container flex min-h-screen flex-col gap-2 p-2">
      <div className="card">
        <GitTruckInfo installedVersion={versionInfo.installedVersion} latestVersion={versionInfo.latestVersion} />
      </div>
      <div className="card">
        <div className="flex flex-col gap-1">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon path={mdiFolder} size={0.9} />
              <p className="font-medium">
                {repositories.length} {repositories.length < totalCount ? `of ${totalCount}` : ""}{" "}
                {repositories.length === 1 ? "repository" : "repositories"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/clear-cache" className="btn btn--danger btn--text max-w-min">
                Clear cache
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 items-stretch gap-2">
            <input
              onChange={(evt) => {
                startTransition(() => {
                  setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev)
                    if (evt.target.value === "") {
                      newParams.delete("search")
                    } else {
                      newParams.set("search", evt.target.value)
                    }
                    return newParams
                  })
                })
              }}
              type="text"
              className="input"
              placeholder="Search repositories..."
            />
            <fieldset
              className="bg-tertiary-bg dark:bg-tertiary-bg-dark border-border dark:border-border-dark flex gap-1 rounded-md border p-1"
              title="Sort repositories"
            >
              <label className="has-[:checked]:bg-blue-primary hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 flex cursor-pointer items-center gap-2 rounded px-3 py-1 transition-colors has-[:checked]:text-white">
                <input
                  type="radio"
                  name="sort-method"
                  value="lastChanged"
                  defaultChecked={sortMethod === "lastChanged"}
                  onChange={(e) => e.target.checked && setSortMethod("lastChanged")}
                  className="hidden"
                />
                <Icon path={mdiClockOutline} size={0.75} />
                <span className="text-sm font-medium">Last changed</span>
              </label>
              <label className="has-[:checked]:bg-blue-primary hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 flex cursor-pointer items-center gap-2 rounded px-3 py-1 transition-colors has-[:checked]:text-white">
                <input
                  type="radio"
                  name="sort-method"
                  value="nameAsc"
                  // checked={sortMethod === "nameAsc"}
                  onChange={(e) => e.target.checked && setSortMethod("nameAsc")}
                  className="hidden"
                />
                <Icon path={mdiSortAscending} size={0.75} />
                <span className="text-sm font-medium">A-Z</span>
              </label>
              <label className="has-[:checked]:bg-blue-primary hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 flex cursor-pointer items-center gap-2 rounded px-3 py-1 transition-colors has-[:checked]:text-white">
                <input
                  type="radio"
                  name="sort-method"
                  value="nameDesc"
                  // checked={sortMethod === "nameDesc"}
                  onChange={(e) => e.target.checked && setSortMethod("nameDesc")}
                  className="hidden"
                />
                <Icon path={mdiSortDescending} size={0.75} />
                <span className="text-sm font-medium">Z-A</span>
              </label>
            </fieldset>
          </div>
          <Pagination className="col-span-5" totalCount={totalCount} />
          <div className="hidden w-full gap-2">
            <Form method="get" className="flex grow gap-1">
              {!fetcher.data?.ok && fetcher.data?.message ? (
                <p className="text-red-500">{fetcher.data.message}</p>
              ) : null}
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
            {/* <Form>
              <input type="hidden" name="path" value={parentDir} />
              <button className="btn btn--primary btn--outlined" type="submit" title="Browse parent directory">
                <Icon path={mdiArrowUp} size={1} className="inline-block" />
              </button>
            </Form> */}
            <Link
              className="btn btn--primary"
              to={`/?${new URLSearchParams({
                path: baseDir
              }).toString()}`}
              prefetch="intent"
            >
              <Icon path={mdiArrowUp} size={1} className="inline-block" />
            </Link>
          </div>
        </div>
        {repositories.length > 0 ? (
          <RepositoryList>
            <div className="text-secondary-text dark:text-secondary-text-dark text-xs font-semibold tracking-wider uppercase">
              Repository
            </div>
            {/* <div className="text-secondary-text dark:text-secondary-text-dark text-xs font-semibold tracking-wider uppercase">
              Branch
            </div> */}
            <div className="text-secondary-text dark:text-secondary-text-dark text-xs font-semibold tracking-wider uppercase">
              Last Changed
            </div>
            <div className="text-secondary-text dark:text-secondary-text-dark text-xs font-semibold tracking-wider uppercase">
              Actions
            </div>
            {repositories.map((repo, i) => (
              <Suspense
                key={repositories[i].path}
                fallback={<RepositoryEntry repo={{ ...repo, status: "Loading" }} status="Loading" isAnalyzed={false} />}
              >
                <Await resolve={analyzedReposPromise}>
                  {(analyzedRepos) =>
                    repo !== null ? (
                      <RepositoryEntry
                        key={repo.path}
                        repo={repo}
                        status="Success"
                        isAnalyzed={analyzedRepos.find((ar) => ar.repo === repo.name) !== undefined}
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
      </div>
    </main>
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
    <div className="row-start-auto grid w-full grid-flow-row grid-cols-[1fr_1fr_min-content] flex-wrap items-center gap-2">
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

  return (
    <Fragment key={entry.path}>
      <Link
        // to={isFolder ? `/?${new URLSearchParams({ path: repo.path }).toString()}` : (path ?? "")}
        to={getPathFromRepoAndHead({ path: entry.path }, [isFolder ? "browse" : "view"])}
        prefetch="none"
        aria-disabled={!isFolder && status === "Error"}
        className={cn(
          "hover:bg-blue-primary/10 dark:hover:bg-blue-primary/20 flex cursor-pointer items-center justify-start gap-2 rounded px-2 py-1 transition-colors",
          {
            "pointer-events-none": !isFolder && status === "Error"
          }
        )}
        title={entry.path}
      >
        <div
          className={cn(
            "aspect-square h-3 flex-shrink-0 rounded-full",
            status === "Error"
              ? "bg-linear-to-bl from-red-500 to-red-600"
              : status === "Loading"
                ? "animate-pulse bg-linear-to-bl from-yellow-500 to-yellow-600"
                : isAnalyzed
                  ? "bg-linear-to-bl from-green-500 to-green-600"
                  : "bg-linear-to-bl from-gray-500 to-gray-400"
          )}
          title={
            status === "Error" ? "Error" : status === "Loading" ? "Loading" : isAnalyzed ? "Analyzed" : "Not analyzed"
          }
        />

        <span className="truncate text-base font-medium">{entry.name}</span>
      </Link>
      {/* <div className="flex place-items-center gap-1">
        {isSuccesful ? (
          <RevisionSelect
            className="not-hover:border-transparent"
            data-testid={`revision-select-${repo.name}`}
            value={head ?? ""}
            onChange={(e) => setHead(e.target.value)}
            headGroups={repo.refs}
            analyzedBranches={analyzedRepos.filter((rep) => rep.repo === repo.name)}
          />
        ) : isError && !isFolder ? (
          <div className="w-0 grow truncate" title={repo.errorMessage}>
            {repo.errorMessage ?? "Unknown error"}
          </div>
        ) : (
          <div className="grow" />
        )}
      </div> */}
      <span className="text-secondary-text dark:text-secondary-text-dark flex place-items-center text-sm">
        {status === "Error"
          ? "-"
          : entry.lastChanged === 0
            ? "-"
            : new Date(entry.lastChanged * 1000).toLocaleDateString()}
      </span>
      <Link
        to={getPathFromRepoAndHead({ path: entry.path }, [isFolder ? "browse" : "view"])}
        className="btn--text flex items-center gap-1"
        title={isFolder ? `Browse ${entry.path}` : `View ${entry.path}`}
      >
        {isFolder ? "Browse" : "View"}
        {/* <Icon path={mdiArrowTopRight} /> */}
      </Link>
      <hr className="col-span-full opacity-50 last:hidden" />
    </Fragment>
  )
}

function Pagination({ className, totalCount }: { className?: string; totalCount: number }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const count = Number(searchParams.get("count") ?? DEFAULT_COUNT.toString())
  const offset = Number(searchParams.get("offset") ?? DEFAULT_OFFSET.toString())
  const pages = Math.ceil(totalCount / count)
  const currentPage = Math.floor(offset / count) + 1

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div>
        <label className="flex items-center gap-2 whitespace-pre">
          Per page
          <select
            className="input"
            onChange={(evt) =>
              setSearchParams((prev) => {
                const newParams = new URLSearchParams(prev)
                newParams.set("count", evt.target.value === "all" ? Infinity.toString() : evt.target.value)
                newParams.set("offset", "0") // Reset to first page when changing count
                return newParams
              })
            }
          >
            {[10, 20, 50, Infinity].map((option) => (
              <option
                key={option}
                value={option === Infinity ? "all" : option}
                // selected={navigation.state === "loading" ? navigation.state option === Infinity ? count === Infinity : count === option}
              >
                {option === Infinity ? "All" : option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grow"></div>
      {offset - count >= 0 ? (
        <Link
          className="btn"
          aria-disabled={offset - count < 0}
          to={`/?${new URLSearchParams({
            offset: Math.max(0, offset - count).toString(),
            count: count.toString()
          }).toString()}`}
          title="Previous page"
        >
          <Icon path={mdiArrowLeft} />
        </Link>
      ) : null}
      <span className="whitespace-pre">
        Page {currentPage} of {pages}
      </span>

      {offset + count < totalCount ? (
        <Link
          className="btn"
          aria-disabled={offset + count >= totalCount}
          to={`/?${new URLSearchParams({
            offset: (offset + count).toString(),
            count: count.toString()
          }).toString()}`}
          title="Next page"
        >
          <Icon path={mdiArrowRight} />
        </Link>
      ) : null}
    </div>
  )
}
