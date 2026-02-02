import { semverCompare } from "~/shared/util"
import gitTruckLogo from "~/assets/truck.png"
import gitTruckLogoGif from "~/assets/truck.gif"
import { UpdateNotifier } from "./UpdateNotifier"
import { mdiAlertOutline, mdiGithub } from "@mdi/js"
import { Icon } from "~/components/Icon"
import { useNavigation } from "react-router"
import { cn } from "~/styling"

export function GitTruckInfo({
  className = "",
  installedVersion,
  latestVersion
}: {
  className?: string
  installedVersion: string
  latestVersion: string | null
}) {
  const updateAvailable = latestVersion && semverCompare(latestVersion, installedVersion) === 1
  const navigationData = useNavigation()
  const loading = navigationData.state !== "idle"

  return (
    <div className={cn("flex flex-row justify-between gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {updateAvailable ? (
            <UpdateNotifier installedVersion={installedVersion} latestVersion={latestVersion} />
          ) : (
            <img
              src={loading ? gitTruckLogoGif : gitTruckLogo}
              alt="Git Truck Logo"
              className="tertiary size-10 rounded-full border p-1"
            />
          )}
          <div className="flex flex-col items-start">
            <h1 className="text-secondary-text dark:text-secondary-text-dark font-semibold">
              <a
                href="https://github.com/git-truck/git-truck"
                className="text-secondary-text dark:text-secondary-text-dark text-xl"
                target="_blank"
                rel="noopener noreferrer"
                title="View on GitHub"
              >
                Git Truck
              </a>
            </h1>
            <span className="text-tertiary-text dark:text-tertiary-text-dark text-xs">Version {installedVersion}</span>
          </div>
        </div>
      </div>

      {/* <div className="flex flex-wrap items-center justify-between gap-2"> */}
      {/* <a
        href="https://github.com/git-truck/git-truck/issues/new?template=user-issue.md"
        className="btn btn--text text-secondary-text dark:text-secondary-text-dark flex items-center gap-2"
        target="_blank"
        rel="noopener noreferrer"
        title="Open an issue"
      >
        <Icon path={mdiAlertOutline} size={1} />
        Open an issue
      </a> */}
      {/* </div> */}
    </div>
  )
}
