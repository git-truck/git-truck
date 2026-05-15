import { semverCompare } from "~/shared/util"
import { UpdateNotifier } from "~/components/UpdateNotifier"
import { Icon } from "~/components/Icon"
import { mdiCloudCheckOutline } from "@mdi/js"

export function GitTruckInfo({
  installedVersion,
  latestVersion
}: {
  installedVersion: string
  latestVersion: string | null
}) {
  const updateAvailable = latestVersion && semverCompare(latestVersion, installedVersion) === 1

  return (
    <>
      {updateAvailable ? (
        <UpdateNotifier installedVersion={installedVersion} latestVersion={latestVersion} />
      ) : (
        <div
          className="relative aspect-square self-center rounded-full p-1"
          title={`Git Truck v${installedVersion} (latest)`}
        >
          <Icon path={mdiCloudCheckOutline} size="1.25em" />
        </div>
      )}
      <h1 className="ml-1" title={updateAvailable ? "" : `Git Truck v${installedVersion} (latest) - View on GitHub`}>
        <a
          href="https://github.com/git-truck/git-truck"
          className="dark:text-secondary-text-dark text-secondary-text text-2xl leading-0 font-semibold"
          target="_blank"
          rel="noopener noreferrer"
        >
          Git Truck
        </a>
      </h1>
    </>
  )
}
