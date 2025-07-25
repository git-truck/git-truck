import { mdiFlaskOutline, mdiArrowUpBoldCircleOutline } from "@mdi/js"
import Icon from "@mdi/react"
import { generateVersionComparisonLink } from "~/shared/util"
import { Code } from "./util"
import { Popover } from "./Popover"
import { cn } from "~/styling"

export function UpdateNotifier({
  installedVersion,
  latestVersion
}: {
  installedVersion: string
  latestVersion: string | null
}) {
  const isExperimental = installedVersion.includes("0.0.0")

  return (
    <Popover
      popoverTitle={isExperimental ? "Experimental version" : "Update available"}
      trigger={({ onClick }) => {
        const title = isExperimental ? "You are using an experimental version" : "Update available"
        const iconPath = isExperimental ? mdiFlaskOutline : mdiArrowUpBoldCircleOutline
        const showIndicator = !isExperimental

        return (
          <button
            title={title}
            className={cn(
              isExperimental
                ? "btn text-primary-text-dark bg-purple-500"
                : "icon-btn relative self-center rounded-full p-1"
            )}
            onClick={onClick}
          >
            {showIndicator && (
              <div className="absolute top-0.5 right-0.5 size-2 rounded-full border border-green-400 bg-green-600" />
            )}
            <Icon path={iconPath} size="1.25em" />
          </button>
        )
      }}
    >
      {isExperimental ? (
        <>
          <p>You are using an experimental build of Git Truck</p>
          <p className="card-p">If you want to use the stable version, close the application and run: </p>
        </>
      ) : (
        <>
          <p>
            {latestVersion ? (
              <a
                className="text-blue-500 hover:underline"
                href={generateVersionComparisonLink({
                  currentVersion: installedVersion,
                  latestVersion: latestVersion
                })}
                target="_blank"
                rel="noopener noreferrer"
                title="See what's new"
              >
                Git Truck v{latestVersion} is now available!
              </a>
            ) : null}{" "}
          </p>
          <p className="card-p">To update, run</p>
        </>
      )}
      <Code inline>npm install -g git-truck@latest</Code>
    </Popover>
  )
}
