import { Link, useNavigate, useNavigation } from "react-router"
import { dateTimeFormatShort } from "~/shared/util"
import { useData } from "../contexts/DataContext"
import { useEffect, useState } from "react"
import { RevisionSelect } from "./RevisionSelect"
import { mdiArrowTopLeft, mdiMenu } from "@mdi/js"
import { Code } from "./util"
import Icon from "@mdi/react"
import { useClient } from "~/hooks"
import { Popover } from "./Popover"

const title = "Git Truck"
const analyzingTitle = "Analyzing | Git Truck"

export function GlobalInfo({ onMenuClick = () => {} }) {
  const client = useClient()
  const { databaseInfo, repo } = useData()
  const transitionState = useNavigation()

  const navigate = useNavigate()

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    document.title = isAnalyzing ? analyzingTitle : title
  }, [isAnalyzing])

  const switchBranch = (branch: string) => {
    setIsAnalyzing(true)
    navigate(["", repo.name, branch].join("/"))
  }
  useEffect(() => {
    if (transitionState.state === "idle") {
      setIsAnalyzing(false)
    }
  }, [transitionState.state])
  const isoString = new Date(databaseInfo.lastRunInfo.time).toISOString()
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex justify-evenly gap-2">
          <Link
            className="btn btn--text"
            to="/"
            // TODO: Implement browsing, requires new routing
            // to={`/?${new URLSearchParams({
            //   path: repo.parentDirPath
            // }).toString()}`}
            title="Browse repositories in parent folder"
            prefetch="intent"
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
              {repo.name}
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
          className="grow-0"
          key={databaseInfo.branch}
          disabled={isAnalyzing}
          onChange={(e) => switchBranch(e.target.value)}
          defaultValue={databaseInfo.branch}
          headGroups={repo.refs}
          analyzedBranches={databaseInfo.analyzedRepos.filter((rep) => rep.repo === databaseInfo.repo)}
        />
        <button className="btn--icon" title="See analysis details" onClick={onMenuClick}>
          <Icon path={mdiMenu} size="1.5em" />
        </button>
      </div>
    </div>
  )
}
