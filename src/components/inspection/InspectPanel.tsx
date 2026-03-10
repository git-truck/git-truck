import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { useClickedObject } from "~/state/stores/clicked-object"
import { isBlob } from "~/shared/util"
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react"
import { EntityAuthors } from "~/components/inspection/EntityAuthors"
import { EntityCommits } from "~/components/inspection/EntityCommits"
import { cn } from "~/styling"
import Details from "~/components/inspection/Metrics"

export function InspectPanel() {
  const clickedObject = useClickedObject()
  const objectPath = clickedObject?.path
  const objectPathIsFile = isBlob(clickedObject)
  return (
    <CollapsibleHeader
      className="card"
      title={
        <>
          {objectPath ? (
            <>
              <span className="truncate" title={objectPath}>
                Inspect:{" "}
                <span className="normal-case">{objectPathIsFile ? objectPath.split("/").pop() : objectPath}</span>
              </span>
            </>
          ) : (
            "Inspect"
          )}
        </>
      }
      contentClassName="pb-6"
    >
      {clickedObject ? (
        <>
          <TabGroup>
            <TabList>
              <Tab
                className={cn("btn btn--outlined roundend-lg mx-[-0.5px] flex-1", {
                  "border-t-transparent border-r-transparent border-l-transparent": false,
                  "rounded-b-xs": true,
                  "rounded-b-none": false,
                  "border-b-transparent": false
                })}
              >
                Metrics
              </Tab>
              <Tab>Authors</Tab>
              <Tab>Commits</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Details />
              </TabPanel>
              <TabPanel>
                <EntityAuthors />
              </TabPanel>
              <TabPanel>
                <EntityCommits />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </>
      ) : (
        <InspectIndex />
      )}
    </CollapsibleHeader>
  )
}

function InspectIndex() {
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="flex items-center gap-1">
          <Key title="Left click">Click</Key> to inspect
        </p>
        <p className="flex items-center gap-1">
          <Key title="Double click">Double click</Key> or <Key title="Scroll">Scroll</Key> to zoom
        </p>
      </div>
    </div>
  )
}

function Key({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <kbd
      className="bg-primary-bg dark:bg-primary-bg-dark h-button flex w-max min-w-max items-center rounded-sm border px-2"
      title={title}
    >
      {children}
    </kbd>
  )
}
