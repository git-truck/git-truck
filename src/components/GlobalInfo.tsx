import { Link, useNavigate } from "react-router"
import { dateTimeFormatShort, getPathFromRepoAndHead } from "~/shared/util"
import { useData } from "../contexts/DataContext"
import { RevisionSelect } from "./RevisionSelect"
import { mdiArrowTopLeft, mdiMenu } from "@mdi/js"
import { Code } from "./util"
import { Icon } from "~/components/Icon"
import { useIsClient } from "~/hooks"
import { Popover } from "./Popover"
import { cn } from "~/styling"

export function GlobalInfo({
  className = "",
  onMenuClick = () => {}
}: {
  className?: string
  onMenuClick?: () => void
}) {
  const client = useIsClient()
  const { databaseInfo, repo } = useData()
  const navigate = useNavigate()

  const isoString = new Date(databaseInfo.lastRunInfo.time).toISOString()
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex justify-evenly gap-2">
          <Link
            className="btn"
            // to="/"
            // TODO: Implement browsing, requires new routing
            to={getPathFromRepoAndHead({ path: repo.parentDirPath }, ["browse"])}
            title="Browse repositories in parent folder"
            // prefetch="render"
          >
            <Icon path={mdiArrowTopLeft} size={0.75} />
          </Link>
        </div>
        <Popover
          popoverTitle="Analysis details"
          trigger={({ onClick }) => (
            <button
              className="text-primary-text dark:text-primary-text-dark hover:text-secondary-text dark:hover:text-secondary-text-dark grow cursor-pointer justify-start gap-2 truncate text-xl"
              onClick={onClick}
              title="View analysis details"
            >
              {repo.repositoryName}
            </button>
          )}
        >
          <div className="grid auto-rows-fr grid-cols-2 gap-0">
            <span>Time analyzed</span>
            <time className="text-right" dateTime={isoString} title={isoString}>
              {client ? dateTimeFormatShort(databaseInfo.lastRunInfo.time * 1000) : ""}
            </time>

            <span>As of commit</span>
            <span className="text-right">
              <Code inline>{databaseInfo.lastRunInfo.hash.slice(0, 7)}</Code>
            </span>

            <span>Files analyzed</span>
            <span className="text-right">{databaseInfo.fileCount ?? 0}</span>

            <span>Commits analyzed</span>
            <span className="text-right">{databaseInfo.commitCount}</span>
          </div>
        </Popover>

        <RevisionSelect
          title="Select branch"
          key={databaseInfo.branch}
          onChange={(e) => navigate(getPathFromRepoAndHead({ path: repo.repositoryPath, branch: e.target.value }))}
          defaultValue={databaseInfo.branch}
          headGroups={repo.refs}
          analyzedBranches={databaseInfo.analyzedRepos.filter((rep) => rep.repo === databaseInfo.repo)}
        />
        <button className="btn" title="See analysis details" onClick={onMenuClick}>
          <Icon path={mdiMenu} size="1.5em" />
        </button>
      </div>
    </div>
  )
}
