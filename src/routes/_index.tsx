import type { SerializeFrom } from "@remix-run/node"
import { Link, useLoaderData, useNavigation } from "@remix-run/react"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { getBaseDirFromPath, getDirName } from "~/analyzer/util.server"
import { Code } from "~/components/util"
import { LoadingIndicator } from "~/components/LoadingIndicator"
import { resolve } from "path"
import type { CompletedResult, Repository } from "~/analyzer/model"
import { GitCaller } from "~/analyzer/git-caller.server"
import { getPathFromRepoAndHead } from "~/util"
import type { ReactNode } from "react"
import { Fragment, useMemo, useState } from "react"
import { RevisionSelect } from "~/components/RevisionSelect"
import gitTruckLogo from "~/assets/truck.png"
import { cn } from "~/styling"
import InstanceManager from "~/analyzer/InstanceManager.server"

interface IndexData {
  repositories: Repository[]
  baseDir: string
  baseDirName: string
  repo: Repository | null
  analyzedRepos: CompletedResult[]
}

async function getResponse(): Promise<IndexData> {
  const args = getArgsWithDefaults()
  const [repo, repositories] = await GitCaller.scanDirectoryForRepositories(args.path)
  const analyzedRepos = await InstanceManager.metadataDB.getCompletedRepos()
  const baseDir = resolve(repo ? getBaseDirFromPath(args.path) : args.path)
  return {
    repositories,
    baseDir,
    baseDirName: getDirName(baseDir),
    repo,
    analyzedRepos
  }
}

export const loader = async () => {
  return await getResponse()
}

export default function Index() {
  const { repositories, baseDir, baseDirName, analyzedRepos } = useLoaderData<typeof loader>()
  const transitionData = useNavigation()

  if (transitionData.state !== "idle")
    return (
      <div className="grid h-screen place-items-center">
        <LoadingIndicator transitionData={transitionData} />
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
      <RepositoryGrid repositories={repositories} analyzedRepos={analyzedRepos} />
    </main>
  )
}

function RepositoryGrid({ repositories, analyzedRepos }: { repositories: SerializeFrom<Repository>[], analyzedRepos: CompletedResult[] }) {
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
        <RepositoryEntry key={repo.path} index={idx} repo={repo} analyzedRepos={analyzedRepos} />
      ))}
    </div>
  )
}

function RepositoryEntry({ repo, analyzedRepos }: { repo: SerializeFrom<Repository>, analyzedRepos: CompletedResult[]; index: number }): ReactNode {
  const [head, setHead] = useState(repo.currentHead)
  const path = useMemo(() => getPathFromRepoAndHead(repo.name, head), [head, repo.name])

  const branchIsAnalyzed = useMemo(() => analyzedRepos.find(rep => rep.repo === repo.name && rep.branch === head), [head, analyzedRepos, repo.name])
  return (
    <Fragment key={repo.name}>
      <h2 className="card__title truncate" title={repo.name}>
        {repo.name}
      </h2>
      <span
        className={cn(
          "w-full min-w-max select-none rounded-full bg-white/20 bg-gradient-to-r px-2 py-1.5 text-center text-xs font-bold uppercase leading-none tracking-widest text-white/90",
          branchIsAnalyzed ? " from-green-500  to-green-600 " : "bg-transparent text-inherit"
        )}
      >
        {branchIsAnalyzed ? "Ready" : "Not analyzed"}
      </span>
      <RevisionSelect
        className="input--hover-border"
        value={head}
        onChange={(e) => setHead(e.target.value)}
        headGroups={repo.refs}
        analyzedBranches={analyzedRepos.filter(rep => rep.repo === repo.name)}
      />
      <div className="grid">
        <Link className={`btn rounded-full ${branchIsAnalyzed ? "btn--success" : ""}`} to={path}>
          {branchIsAnalyzed ? "View" : "Analyze"}
        </Link>
      </div>
    </Fragment>
  )
}
