import type { SerializeFrom } from "@remix-run/node"
import { Link, useLoaderData, useNavigation } from "@remix-run/react"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { getBaseDirFromPath, getDirName } from "~/analyzer/util.server"
import { Code } from "~/components/util"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { resolve } from "path"
import type { Repository } from "~/analyzer/model"
import { GitCaller } from "~/analyzer/git-caller.server"
import { getPathFromRepoAndHead } from "~/util"
import type { ReactNode } from "react"
import { Fragment, useState } from "react"
import { RevisionSelect } from "~/components/RevisionSelect"
import gitTruckLogo from "~/assets/truck.png"
import { cn } from "~/styling"

interface IndexData {
  repositories: Repository[]
  baseDir: string
  baseDirName: string
  repo: Repository | null
}

async function getResponse(): Promise<IndexData> {
  const args = getArgsWithDefaults()
  const [repo, repositories] = await GitCaller.scanDirectoryForRepositories(args.path, args.invalidateCache)

  const baseDir = resolve(repo ? getBaseDirFromPath(args.path) : args.path)
  return {
    repositories,
    baseDir,
    baseDirName: getDirName(baseDir),
    repo
  }
}

export const loader = async () => {
  return await getResponse()
}

export default function Index() {
  const { repositories, baseDir, baseDirName } = useLoaderData<typeof loader>()
  const transitionData = useNavigation()

  if (transitionData.state !== "idle")
    return (
      <div className="grid h-screen place-items-center">
        <LoadingIndicator />
      </div>
    )
  return (
    <main className="m-auto flex min-h-screen w-full max-w-4xl flex-col gap-2 p-2">
      <div className="card">
        <h1 className="flex items-center text-4xl">
          <img src={gitTruckLogo} alt="Git Truck" className="mr-2 inline-block h-12" />
          Git Truck
        </h1>
        <p>
          <>
            Found {repositories.length} git repositor{repositories.length === 1 ? "y" : "ies"} in the folder{" "}
            <Code inline title={baseDir}>
              {baseDirName}
            </Code>
            .
          </>
        </p>
      </div>
      <RepositoryGrid repositories={repositories} />
    </main>
  )
}

function RepositoryGrid({ repositories }: { repositories: SerializeFrom<Repository>[] }) {
  return repositories.length === 0 ? (
    <>
      <p>
        Try running <Code inline>git-truck</Code> in another folder or provide another path as argument.
      </p>
    </>
  ) : (
    <div className="card row-start-auto grid w-full grid-flow-row grid-cols-[max-content,1fr,1fr,1fr] flex-wrap items-center gap-1">
      <h2 className="card__title truncate break-all" title="Clone repository">
        Clone repository
      </h2>
      <span className="select-none rounded-full bg-gradient-to-r  from-blue-500 to-blue-600 px-2 py-1.5 text-center text-xs font-bold uppercase leading-none tracking-widest text-white/90">
        Coming soon
      </span>
      <input type="text" className="input input--hover-border" placeholder="git@github.com/owner/repo.git" />

      <button className="btn rounded-full" disabled title="Coming soon!">
        Clone
      </button>
      <hr className="col-span-full" />
      {repositories.map((repo, idx) => (
        <RepositoryEntry key={repo.path} index={idx} repo={repo} />
      ))}
    </div>
  )
}

function RepositoryEntry({ repo, index }: { repo: SerializeFrom<Repository>; index: number }): ReactNode {
  const [head, setHead] = useState(repo.currentHead)
  const path = getPathFromRepoAndHead(repo.name, head)

  const branchIsAnalyzed = repo.analyzedHeads[head]

  const groupClasses = `peer row-${index} peer-[.row-${index}:hover]:bg-white`

  return (
    <Fragment key={repo.name}>
      <h2 className={cn("card__title truncate", groupClasses)} title={repo.name}>
        {repo.name}
      </h2>
      <span
        className={cn(
          "w-full min-w-max select-none rounded-full bg-white/20 bg-gradient-to-r px-2 py-1.5 text-center text-xs font-bold uppercase leading-none tracking-widest text-white/90",
          groupClasses,
          branchIsAnalyzed ? " from-green-500  to-green-600 " : "bg-transparent text-inherit"
        )}
      >
        {branchIsAnalyzed ? "Ready" : "Not analyzed"}
      </span>
      <RevisionSelect
        className={cn("input--hover-border", groupClasses)}
        value={head}
        onChange={(e) => setHead(e.target.value)}
        headGroups={repo.refs}
        analyzedHeads={repo.analyzedHeads}
      />
      <div className={cn("grid", groupClasses)}>
        <Link className={`btn rounded-full ${branchIsAnalyzed ? "btn--success" : ""}`} to={path}>
          {branchIsAnalyzed ? "View" : "Analyze"}
        </Link>
      </div>
    </Fragment>
  )
}
