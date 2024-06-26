import { ActionFunctionArgs, defer, type SerializeFrom } from "@remix-run/node"
import { Await, Form, Link, useFetcher, useLoaderData, useNavigation } from "@remix-run/react"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { Code } from "~/components/util"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import type { Repository } from "~/analyzer/model"
import { GitCaller } from "~/analyzer/git-caller.server"
import { getPathFromRepoAndHead } from "~/util"
import type { ReactNode } from "react"
import { Suspense, Fragment, useState } from "react"
import { RevisionSelect } from "~/components/RevisionSelect"
import gitTruckLogo from "~/assets/truck.png"
import { cn } from "~/styling"
import { existsSync, promises as fs } from "node:fs"
import { join, resolve } from "node:path"
import { getBaseDirFromPath } from "~/analyzer/util.server"
import Icon from "@mdi/react"
import { mdiArrowUp, mdiFolder, mdiGit, mdiTruckAlert } from "@mdi/js"
import { log } from "~/analyzer/log.server"

// TODO: Implement browsing, requires new routing
// export const loader = async ({ request }: LoaderFunctionArgs) => {
// const queryPath = new URL(request.url).searchParams.get("path")
export const loader = async () => {
  const queryPath = null

  const args = getArgsWithDefaults()

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

  const entries = await fs.readdir(baseDir, { withFileTypes: true })

  // Get all directories that has a .git subdirectory
  const repos = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(baseDir, entry.name)) &&
        !entry.name.startsWith(".") &&
        // TODO: Implement browsing, requires new routing
        existsSync(join(baseDir, entry.name, ".git"))
    )
    .map(({ name }) => name)

  // Get metadata for all repos in parallel
  // Returns an object, as `defer` does not support arrays
  // The keys are prefixed with an underscore to avoid conflicts with other properties returned from the loader
  const repoPromises = Object.fromEntries(
    repos.map((repo) => [`_${repo}`, GitCaller.getRepoMetadata(join(baseDir, repo), args.invalidateCache)])
  )

  return defer<{
    baseDir: string
    parentDir: string
    repos: string[]
    [key: string]: Repository | string | string[]
  }>({
    baseDir,
    parentDir: getBaseDirFromPath(baseDir),
    repos,
    ...repoPromises
  })
}

export const action = async ({ request }: ActionFunctionArgs) => {
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

export default function Index() {
  const { baseDir, repos, parentDir, ...repoPromises } = useLoaderData<typeof loader>()
  const transitionData = useNavigation()
  const fetcher = useFetcher<typeof action>()

  if (transitionData.state !== "idle")
    return (
      <div className="grid h-screen place-items-center">
        <LoadingIndicator />
      </div>
    )

  return (
    <main className="m-auto flex min-h-screen w-full max-w-2xl flex-col gap-2 p-2">
      <div className="card">
        <h1 className="flex items-center text-4xl">
          <img src={gitTruckLogo} alt="Git Truck" className="mr-2 inline-block h-12" />
          Git Truck
        </h1>
        <div className="flex flex-col gap-1">
          <p>
            Found {repos.length} folder{repos.length === 1 ? "" : "s"}
          </p>
          {/* <div className="flex w-full gap-2"> */}
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
                path: parentDir
              }).toString()}`}
              prefetch="intent"
            >
              <Icon path={mdiArrowUp} size={1} className="inline-block" />
            </Link>
          </div>
        </div>
      </div>
      {repos.length > 0 ? (
        <RepositoryList>
          <div className="opacity-80">Folder</div>
          <div className="opacity-80">Status</div>
          <div className="col-span-2 opacity-80">Actions</div>
          {repos.map((dir, i) => (
            <Suspense
              key={repos[i]}
              fallback={
                <RepositoryEntry
                  repo={{
                    name: dir,
                    path: dir,
                    fullPath: join(baseDir, dir),
                    parentDirPath: baseDir,
                    status: "Loading"
                  }}
                />
              }
            >
              <Await resolve={repoPromises[`_${dir}`]}>
                {(repo) => (repo !== null ? <RepositoryEntry repo={repo as Repository} /> : null)}
              </Await>
            </Suspense>
          ))}
        </RepositoryList>
      ) : (
        <div className="card w-full place-items-center">
          <LoadingIndicator loadingText="This looks empty... Try another folder" hideInitially={false} />
        </div>
      )}
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
    <div className="card row-start-auto grid w-full grid-flow-row grid-cols-[1fr,1fr,1fr,auto] flex-wrap items-center gap-2">
      {/* <h2 className="card__title truncate break-all" title="Clone repository">
        Clone repository
      </h2>
      <span className="select-none rounded-full bg-gradient-to-r  from-blue-500 to-blue-600 px-2 py-1.5 text-center text-xs font-bold uppercase leading-none tracking-widest text-white/90">
        Coming soon
      </span>
      <input type="text" className="input input--hover-border" placeholder="git@github.com/owner/repo.git" />

      <button className="btn rounded-full" disabled title="Coming soon!">
        Clone
      </button>
      <hr className="col-span-full" /> */}
      {children}
    </div>
  )
}

function RepositoryEntry({ repo }: { repo: SerializeFrom<Repository> }): ReactNode {
  const isSuccesful = repo.status === "Success"
  const isError = repo.status === "Error"

  const [head, setHead] = useState(isSuccesful ? repo.currentHead : null)
  const path = head ? getPathFromRepoAndHead(repo.name, head) : null

  const isFolder = repo.status === "Error" && repo.errorMessage === "Not a git repository"
  const isAnalyzed = repo.status === "Success" && head !== null ? repo.analyzedHeads[head] : false

  return (
    <Fragment key={repo.name}>
      <h2 className="card__title flex justify-start gap-2" title={join(repo.parentDirPath, repo.name)}>
        {!isError ? (
          <Icon path={mdiGit} size={1} className="inline-block flex-shrink-0" title="Git repository" />
        ) : isFolder ? (
          <Icon path={mdiFolder} size={1} className="inline-block flex-shrink-0" title="Folder" />
        ) : (
          <Icon path={mdiTruckAlert} size={1} className="inline-block flex-shrink-0" title="Error" />
        )}
        <span className="truncate text-left">{repo.name}</span>
      </h2>
      <div className="flex place-items-center gap-1">
        {isFolder ? (
          <div />
        ) : (
          <div
            className={cn("aspect-square h-2 rounded-full", {
              "bg-gradient-to-bl from-green-500 to-green-600": repo.status === "Success" && isAnalyzed,
              "bg-gradient-to-bl from-red-500 to-red-600": repo.status === "Error",
              "animate-pulse bg-gradient-to-bl from-yellow-500 to-yellow-600": repo.status === "Loading",
              "bg-gradient-to-bl from-gray-500 to-gray-400": repo.status === "Success" && !isAnalyzed
            })}
          />
        )}
        {isFolder ? (
          <div className="grow" />
        ) : (
          <span
            data-testid={`status-${repo.name}`}
            className={cn(
              "w-full min-w-max select-none rounded-full bg-transparent px-2 py-1.5 text-xs font-bold uppercase leading-none tracking-widest text-inherit transition-colors duration-200"
            )}
          >
            {repo.status === "Success" ? (isAnalyzed ? "Analyzed" : "Not analyzed") : repo.status}
          </span>
        )}
      </div>
      <div className="flex place-items-center gap-1">
        {isSuccesful ? (
          <RevisionSelect
            className="input--hover-border"
            data-testid={`revision-select-${repo.name}`}
            value={head ?? ""}
            onChange={(e) => setHead(e.target.value)}
            headGroups={repo.refs}
            analyzedHeads={repo.analyzedHeads}
          />
        ) : isError && !isFolder ? (
          <div className="grow truncate" title={repo.errorMessage}>
            {repo.errorMessage ?? "Unknown error"}
          </div>
        ) : (
          <div className="grow" />
        )}
      </div>
      {isFolder ? (
        // <Form method="get">
        //   <input type="hidden" name="path" value={repo.path} />
        //   <button className="btn btn--primary btn--outlined transition-colors" type="submit">
        //     Browse
        //   </button>
        // </Form>
        <Link
          className="btn btn--primary"
          to={`/?${new URLSearchParams({
            path: repo.path
          }).toString()}`}
          prefetch="intent"
        >
          Browse
        </Link>
      ) : (
        <Link
          className="btn btn--primary btn--outlined transition-colors"
          title={`View ${repo.name}`}
          aria-disabled={repo.status === "Error" || repo.status === "Loading"}
          // to={`/repo/?${new URLSearchParams({ path: repo.fullPath ?? "", branch: head ?? "" }).toString()}`}
          to={path ?? ""}
          prefetch="intent"
        >
          View
        </Link>
      )}
      <hr className="col-span-full last:hidden" />
    </Fragment>
  )
}
