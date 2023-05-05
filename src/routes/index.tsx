import type { SerializeFrom } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Link, useLoaderData, useNavigation } from "@remix-run/react"
import { getArgsWithDefaults } from "~/analyzer/args.server"
import { getBaseDirFromPath, getDirName } from "~/analyzer/util.server"
import { Code } from "~/components/util"
import { AnalyzingIndicator } from "~/components/AnalyzingIndicator"
import { resolve } from "path"
import type { Repository } from "~/analyzer/model"
import { GitCaller } from "~/analyzer/git-caller.server"
import { getPathFromRepoAndHead } from "~/util"
import { useState } from "react"
import { RevisionSelect } from "~/components/RevisionSelect"

interface IndexData {
  repositories: Repository[]
  baseDir: string
  baseDirName: string
  repo: Repository | null
}

export const loader = async () => {
  const args = await getArgsWithDefaults()
  const [repo, repositories] = await GitCaller.scanDirectoryForRepositories(args.path)

  const baseDir = resolve(repo ? getBaseDirFromPath(args.path) : args.path)
  const repositoriesResponse = json<IndexData>({
    repositories,
    baseDir,
    baseDirName: getDirName(baseDir),
    repo,
  })

  const response = repositoriesResponse

  return response
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>()
  const { repositories, baseDir, baseDirName } = loaderData
  const transitionData = useNavigation()

  if (transitionData.state !== "idle") return <AnalyzingIndicator />
  return (
    <main className="m-auto flex w-full max-w-7xl flex-col gap-2 p-2">
      <div className="card">
        <h1 className="text-4xl">🚛 Git Truck</h1>
        <p>
          Found {repositories.length} git repositor{repositories.length === 1 ? "y" : "ies"} in the folder{" "}
          <Code inline title={baseDir}>
            {baseDirName}
          </Code>
          .
        </p>
      </div>
      {repositories.length === 0 ? (
        <>
          <p>
            Try running <Code inline>git-truck</Code> in another folder or provide another path as argument.
          </p>
        </>
      ) : (
        <>
          <nav>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(225px,1fr))] gap-2">
              {repositories.map((repo) => (
                <RepositoryEntry key={repo.path} repo={repo} />
              ))}
              <li className="card gap-3 p-0">
                <h2
                  className="card__title rounded-t bg-gradient-to-r from-blue-500 to-blue-600 p-3 pb-3 text-white transition-colors"
                  title="Add repository"
                >
                  <span className="line-clamp-1 break-all">Add repository</span>
                  <span className="align-content-start right-0 top-0 flex min-w-max select-none place-items-center rounded-full  bg-white/20 px-2 py-1.5 text-xs font-bold uppercase leading-none tracking-widest text-white/90">
                    Coming soon
                  </span>
                </h2>
                <div className="flex flex-col gap-2 p-3 pt-0">
                  <input type="text" className="input" placeholder="git@github.com/owner/repo.git" />

                  <button className="btn" disabled title="Coming soon!">
                    Clone
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </>
      )}
    </main>
  )
}

function RepositoryEntry({ repo }: { repo: SerializeFrom<Repository> }): JSX.Element {
  const [head, setHead] = useState(repo.currentHead)
  const path = getPathFromRepoAndHead(repo.name, head)

  const branchIsAnalyzed = repo.analyzedHeads[head]

  return (
    <div key={repo.name}>
      <div className="card gap-3 p-0">
        <h2
          className={`card__title rounded-t bg-gradient-to-r p-3 text-white ${
            branchIsAnalyzed ? " from-green-500  to-green-600 " : "from-gray-500 to-gray-600"
          }`}
          title={repo.name}
        >
          <span className="line-clamp-1 break-all">{repo.name}</span>
          <span className="align-content-start right-0 top-0 flex min-w-max select-none place-items-center rounded-full  bg-white/20 px-2 py-1.5 text-xs font-bold uppercase leading-none tracking-widest text-white/90">
            {branchIsAnalyzed ? "Ready" : "Not analyzed"}
          </span>
        </h2>
        <div className="flex flex-col gap-2 p-3 pt-0">
          <RevisionSelect
            value={head}
            onChange={(e) => setHead(e.target.value)}
            headGroups={repo.refs}
            analyzedHeads={repo.analyzedHeads}
          />
          <div className="grid">
            <Link className={`btn ${branchIsAnalyzed ? "btn--success" : ""}`} to={path}>
              {branchIsAnalyzed ? "View" : "Analyze"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
