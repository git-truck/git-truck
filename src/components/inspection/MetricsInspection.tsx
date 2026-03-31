import {
  mdiAccountGroup,
  mdiFileOutline,
  mdiPlusMinusVariant,
  mdiPulse,
  mdiSourceCommit,
  mdiFolderOutline,
  mdiEyeOffOutline,
  mdiSourceRepository
} from "@mdi/js"
import byteSize from "byte-size"
import { useQueryState } from "nuqs"
import { useEffect, type ReactNode } from "react"
import { useFetcher, href, Form, useNavigation } from "react-router"
import { MetricInspectionPanel, type MetricPanelActions } from "~/components/inspection/MetricInspectionPanel"
import { Icon } from "~/components/Icon"
import { missingInMapColor, UNKNOWN_CATEGORY } from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.inspect.metrics"
import { dateFormatRelative, isRepositoryRoot, last, resolveParentFolder } from "~/shared/util"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { useViewAction } from "~/hooks"
import { usePath } from "~/contexts/PathContext"
import type { GitObject, HexColor } from "~/shared/model"
import { FileSizeMetric } from "~/metrics/fileSize"
import { ContributorsMetric } from "~/metrics/contributors"
import type { MetricType } from "~/metrics/metrics"
import { TypeMetric } from "~/metrics/fileExtension"
import { CommitsMetric } from "~/metrics/mostCommits"
import { TopContributorMetric } from "~/metrics/topContributer"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import { LastChangedMetric } from "~/metrics/lastChanged"

export function MetricsInspection() {
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const clickedObject = useClickedObject()
  const data = useData()
  const [metricsData, contributorColors] = useMetrics()
  const { metricType, setMetricType } = useOptions()

  const isBlob = clickedObject?.type === "blob"
  const isRepo = isRepositoryRoot(clickedObject)

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(
      href("/view/api/inspect/metrics") +
        viewSerializer({ objectPath: clickedObject.path, objectType: clickedObject.type, path })
    )
    return () => {
      fetcher.reset()
    }
    // For some reason, fetcher does not have a stable identity and causes an infinite loop when added to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path, path])

  if (!clickedObject) {
    return <p className="p-4">No file or folder selected</p>
  }

  const currentFetcherData = fetcher.data?.path === clickedObject.path ? fetcher.data : undefined
  const objectHasChangesInSelectedRange = isBlob
    ? Boolean(data.databaseInfo.commitCounts[clickedObject.path])
    : currentFetcherData?.existsInRange

  if (objectHasChangesInSelectedRange === false) {
    return <p className="p-4">{isBlob ? "File" : "Folder"} does not exist in selected time range</p>
  }

  const sumFileSizeRecursive = (node: GitObject): number => {
    if (node.type !== "tree") {
      return node.sizeInBytes
    }

    return (node.children ?? []).reduce((sum, child): number => {
      if (child.type !== "tree") {
        return sum + child.sizeInBytes
      }

      return sum + sumFileSizeRecursive(child)
    }, 0)
  }

  const commitCount: number | null = isBlob
    ? data.databaseInfo.commitCounts[clickedObject.path]
    : currentFetcherData
      ? currentFetcherData.amountOfCommits
      : null

  const metrics: Record<
    MetricType,
    {
      description: string
      icon: string
      data: ReactNode
      inspectionPanels: Array<React.ComponentType>
      actions: MetricPanelActions
      colors?: Array<HexColor>
    }
  > = {
    FILE_TYPE: {
      description: clickedObject.type === "tree" ? "folder type" : "file type",
      icon: isRepo ? mdiSourceRepository : isBlob ? mdiFileOutline : mdiFolderOutline,
      data: isRepo ? "Repository" : isBlob ? "." + last(clickedObject.name.split(".")) : "Directory",
      inspectionPanels: TypeMetric.inspectionPanels,
      actions: { search: true, clear: true },
      colors: metricsData
        .get("FILE_TYPE")
        ?.categoriesMap?.get(clickedObject.path)
        ?.map((c) => c.color)
    },
    FILE_SIZE: {
      description: clickedObject.type === "tree" ? "folder size" : "file size",
      icon: FileSizeMetric.icon,
      inspectionPanels: FileSizeMetric.inspectionPanels,
      data: isBlob
        ? byteSize(clickedObject.sizeInBytes ?? 0).value + " " + byteSize(clickedObject.sizeInBytes ?? 0).unit
        : byteSize(sumFileSizeRecursive(clickedObject) ?? 0).value +
          " " +
          byteSize(sumFileSizeRecursive(clickedObject) ?? 0).unit,
      actions: { search: false, clear: false },
      colors: metricsData
        .get("FILE_SIZE")
        ?.categoriesMap?.get(clickedObject.path)
        ?.map((c) => c.color)
    },
    MOST_COMMITS: {
      description: commitCount && commitCount === 1 ? "commit" : "commits",
      icon: mdiSourceCommit,
      data: commitCount?.toLocaleString() ?? "loading...",
      inspectionPanels: CommitsMetric.inspectionPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      colors: metricsData
        .get("MOST_COMMITS")
        ?.categoriesMap?.get(clickedObject.path)
        ?.map((c) => c.color)
    },
    TOP_CONTRIBUTOR: {
      description: "is the top contributor",
      icon: mdiAccountGroup,
      data: currentFetcherData ? (currentFetcherData.topContributor?.contributor ?? UNKNOWN_CATEGORY) : "loading...",
      inspectionPanels: TopContributorMetric.inspectionPanels,
      actions: { search: true, clear: true, groupContributors: true, shuffleContributorColors: true },
      colors: [
        currentFetcherData?.topContributor?.contributor
          ? ((contributorColors.get(currentFetcherData?.topContributor?.contributor) as HexColor) ?? missingInMapColor)
          : (missingInMapColor as HexColor)
      ]
    },
    MOST_CONTRIBUTIONS: {
      description: "line changes",
      icon: mdiPlusMinusVariant,
      data: isBlob
        ? data.databaseInfo.contribSumPerFile[clickedObject.path].toLocaleString()
        : Object.entries(data.databaseInfo.contribSumPerFile)
            .filter(([path]) => clickedObject.path && path.startsWith(clickedObject.path))
            .reduce((sum, [_, count]) => sum + count, 0)
            .toLocaleString(),
      inspectionPanels: LinesChangedMetric.inspectionPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      colors: metricsData
        .get("MOST_CONTRIBUTIONS")
        ?.categoriesMap?.get(clickedObject.path)
        ?.map((c) => c.color)
    },
    LAST_CHANGED: {
      description: "since last change",
      icon: mdiPulse,
      data: isBlob
        ? (dateFormatRelative(data.databaseInfo.lastChanged[clickedObject.path]) ?? "unknown")
        : (dateFormatRelative(
            // TODO: Get this data from the server, which is much faster
            Math.max(
              ...Object.entries(data.databaseInfo.lastChanged)
                .filter(([path]) => clickedObject.path && path.startsWith(clickedObject.path))
                .map(([_, epoch]) => epoch)
            )
          ) ?? "unknown"),
      inspectionPanels: LastChangedMetric.inspectionPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      colors: metricsData
        .get("LAST_CHANGED")
        ?.categoriesMap?.get(clickedObject.path)
        ?.map((c) => c.color)
    },
    CONTRIBUTORS: {
      icon: ContributorsMetric.icon,
      description: "contributors",
      data: currentFetcherData ? (currentFetcherData.contributorCounts?.length ?? UNKNOWN_CATEGORY) : "loading...",
      inspectionPanels: ContributorsMetric.inspectionPanels,
      actions: { search: true, clear: true, groupContributors: true, shuffleContributorColors: true }
    }
  } as const

  const { icon, inspectionPanels, actions } = metrics[metricType]

  return (
    <>
      <InteractionButtons />
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(metrics) as Array<[MetricType, (typeof metrics)[MetricType]]>).map(
          ([metric, { icon, data, colors: color, description }]) => (
            <MetricButton
              key={metric}
              icon={icon}
              isExpanded={metric === metricType}
              style={{
                ...(metric === metricType ? { backgroundColor: `hsl(from ${color} h s l / 0.7)` } : {})
              }}
              onClick={() => {
                setMetricType(metric)
              }}
            >
              <p className="w-full truncate text-sm font-bold">{data}</p>
              <p className="truncate text-xs font-normal opacity-70">{description}</p>
            </MetricButton>
          )
        )}
      </div>
      {inspectionPanels.map((Panel, i) => (
        <MetricInspectionPanel key={i} icon={icon} actions={i === 0 ? actions : undefined}>
          <Panel />
        </MetricInspectionPanel>
      ))}
    </>
  )
}

function MetricButton({
  icon,
  isExpanded,
  children,
  ...props
}: {
  icon: string
  isExpanded: boolean
  children: ReactNode
  style: React.CSSProperties
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={cn("btn flex h-full w-full flex-row items-center justify-between gap-5 px-2 py-1", {
        "ring-primary ring-2": isExpanded
      })}
      {...props}
    >
      <Icon path={icon} size={0.75} />
      <div className="flex flex-col overflow-hidden text-right">{children}</div>
    </button>
  )
}

function InteractionButtons() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const viewAction = useViewAction()
  const { state } = useNavigation()
  const { setPath } = usePath()

  if (!clickedObject) {
    return null
  }

  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Form
        className="w-max"
        method="post"
        action={viewAction}
        onSubmit={() => {
          if (!isBlob) setPath(resolveParentFolder(clickedObject.path))
          setClickedObject(null)
        }}
      >
        <input type="hidden" name="hide" value={clickedObject.path} />
        <button className="btn" disabled={state !== "idle"} title="Hide this file">
          <Icon path={mdiEyeOffOutline} />
          Hide
        </button>
      </Form>
      {isBlob ? (
        <>
          {clickedObject.name.includes(".") ? (
            <Form className="w-max" method="post" action={viewAction} onSubmit={() => setClickedObject(null)}>
              <input type="hidden" name="hide" value={`*.${extension}`} />
              <button className="btn" disabled={state !== "idle"} title={`Hide all files with .${extension} extension`}>
                <Icon path={mdiEyeOffOutline} />
                <span>Hide *.{extension}</span>
              </button>
            </Form>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
