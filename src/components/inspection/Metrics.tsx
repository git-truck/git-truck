import {
  mdiAccountGroup,
  mdiFileOutline,
  mdiPlusMinusVariant,
  mdiPulse,
  mdiSourceCommit,
  mdiFolderOutline,
  mdiEyeOffOutline,
  mdiMagnify,
  mdiSourceRepository
} from "@mdi/js"
import byteSize from "byte-size"
import { useQueryState, useQueryStates } from "nuqs"
import { useEffect, type ReactNode } from "react"
import { useFetcher, href, Form, Link, useNavigation, useLocation } from "react-router"
import { ContributorsInspection } from "~/components/inspection/ContributorsInspection"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import {
  MetricInspectionPanel,
  useMetricSearchContext,
  type MetricPanelActions
} from "~/components/inspection/MetricInspectionPanel"
import { Icon } from "~/components/Icon"
import { missingInMapColor } from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.inspect.metrics"
import { dateFormatRelative, isRepositoryRoot, last, resolveParentFolder } from "~/shared/util"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { useViewAction } from "~/hooks"
import { usePath } from "~/contexts/PathContext"
import type { GitObject, HexColor } from "~/shared/model"
import { Metric, type MetricType } from "~/metrics/metrics"
import { GradientLegend } from "~/components/legend/GradiantLegend"
import { PointLegend } from "~/components/legend/PointLegend"
import { SegmentLegend } from "~/components/legend/SegmentLegend"
import { FileSizeMetric } from "~/metrics/fileSize"

function FileTypePanels() {
  const { searchValue, onSearchChange } = useMetricSearchContext()

  return <PointLegend externalSearchValue={searchValue} onExternalSearchChange={onSearchChange} />
}

function FileSizePanels() {
  return <SegmentLegend hoveredObject={null} />
}

function CommitPanels() {
  return (
    <>
      <GradientLegend hoveredObject={null} />
      <CommitsInspection />
    </>
  )
}

function ContributorPanels() {
  const { searchValue, onSearchChange } = useMetricSearchContext()

  return <PointLegend externalSearchValue={searchValue} onExternalSearchChange={onSearchChange} />
}

function LinesChangedPanels() {
  return <GradientLegend hoveredObject={null} />
}

function LastChangedPanels() {
  return <SegmentLegend hoveredObject={null} />
}

export default function Metrics() {
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

  const formatCount = (value: number | undefined) => value?.toLocaleString() ?? "0"

  const metrics: Record<
    MetricType,
    {
      description: string
      icon: string
      data: ReactNode
      inspectionContent: React.ComponentType
      actions: MetricPanelActions
      color?: HexColor
    }
  > = {
    FILE_TYPE: {
      description: "extension",
      icon: isRepo ? mdiSourceRepository : isBlob ? mdiFileOutline : mdiFolderOutline,
      data: isRepo ? "Repository" : isBlob ? "." + last(clickedObject.name.split(".")) : "Directory",
      inspectionContent: FileTypePanels,
      actions: { search: true, clear: true },
      color: metricsData.get("FILE_TYPE")?.colormap?.get(clickedObject.path)
    },
    FILE_SIZE: {
      description: isBlob ? "File Size" : "Nested Files",
      icon: FileSizeMetric.icon,
      inspectionContent: FileSizePanels,
      data: isBlob
        ? byteSize(clickedObject.sizeInBytes ?? 0).value + " " + byteSize(clickedObject.sizeInBytes ?? 0).unit
        : byteSize(sumFileSizeRecursive(clickedObject) ?? 0).value +
          " " +
          byteSize(sumFileSizeRecursive(clickedObject) ?? 0).unit,
      actions: { search: false, clear: false },
      color: metricsData.get("FILE_SIZE")?.colormap?.get(clickedObject.path)
    },
    MOST_COMMITS: {
      description: "# commits",
      icon: mdiSourceCommit,
      data: isBlob
        ? formatCount(data.databaseInfo.commitCounts[clickedObject.path])
        : currentFetcherData
          ? currentFetcherData.amountOfCommits.toLocaleString()
          : "loading...",
      inspectionContent: CommitPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: metricsData.get("MOST_COMMITS")?.colormap?.get(clickedObject.path)
    },
    TOP_CONTRIBUTOR: {
      description: "most line-contributing contributor",
      icon: mdiAccountGroup,
      data: currentFetcherData ? (currentFetcherData.topContributor?.contributor ?? "unknown") : "loading...",
      inspectionContent: ContributorPanels,
      actions: { search: true, clear: true, groupContributors: true, shuffleContributorColors: true },
      color: currentFetcherData?.topContributor?.contributor
        ? ((contributorColors.get(currentFetcherData?.topContributor?.contributor) as HexColor) ?? missingInMapColor)
        : (missingInMapColor as HexColor)
    },
    MOST_CONTRIBUTIONS: {
      description: "# Line changes",
      icon: mdiPlusMinusVariant,
      data: isBlob
        ? formatCount(data.databaseInfo.contribSumPerFile[clickedObject.path])
        : Object.entries(data.databaseInfo.contribSumPerFile)
            .filter(([path]) => clickedObject.path && path.startsWith(clickedObject.path))
            .reduce((sum, [_, count]) => sum + count, 0)
            .toLocaleString(),
      inspectionContent: LinesChangedPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: metricsData.get("MOST_CONTRIBUTIONS")?.colormap?.get(clickedObject.path)
    },
    LAST_CHANGED: {
      description: "last changed timestamp",
      icon: mdiPulse,
      data: isBlob
        ? (dateFormatRelative(data.databaseInfo.lastChanged[clickedObject.path]) ?? "unknown")
        : (dateFormatRelative(
            Math.max(
              ...Object.entries(data.databaseInfo.lastChanged)
                .filter(([path]) => clickedObject.path && path.startsWith(clickedObject.path))
                .map(([_, epoch]) => epoch)
            )
          ) ?? "unknown"),
      inspectionContent: LastChangedPanels,
      actions: { search: false, clear: false },
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: metricsData.get("LAST_CHANGED")?.colormap?.get(clickedObject.path)
    }
  } as const

  const { icon, inspectionContent: ExpandedPanel, actions } = metrics[metricType] ?? null

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(metrics) as Array<[MetricType, (typeof metrics)[MetricType]]>).map(
          ([metric, { icon, data, color }]) => (
            <MetricButton
              key={metric}
              metric={metric}
              icon={icon}
              path={clickedObject.path}
              type={clickedObject.type}
              color={color}
              metricType={metricType}
              onClick={() => {
                setMetricType(metric)
              }}
            >
              {data}
            </MetricButton>
          )
        )}
      </div>
      <MetricInspectionPanel icon={icon} actions={actions}>
        {ExpandedPanel ? <ExpandedPanel key={clickedObject.path} /> : <p>This metric has no inspection currently</p>}
      </MetricInspectionPanel>
      <InteractionButtons />
    </>
  )
}

function MetricButton({
  icon,
  metric,
  children,
  path,
  type,
  color,
  metricType,
  onClick
}: {
  metric: MetricType
  icon: string
  children: ReactNode
  path: string
  type: "blob" | "tree"
  color?: HexColor
  metricType?: string
  onClick?: () => void
}) {
  const isExpanded = metric === metricType
  const backgroundColor = isExpanded ? (color ?? missingInMapColor) : undefined
  return (
    <button
      type="button"
      className={cn("btn flex h-full w-full flex-row items-center justify-between gap-5 px-2 py-1", {
        "ring-primary ring-2": isExpanded
      })}
      style={{
        ...(backgroundColor ? { backgroundColor: `hsl(from ${backgroundColor} h s l / 0.7)` } : {})
      }}
      onClick={onClick}
    >
      <Icon path={icon} size={0.75} />
      <div className="flex flex-col overflow-hidden text-right">
        <p className="w-full truncate text-sm font-bold">{children}</p>
        <p className="truncate text-[10px] font-normal italic">
          {metric.startsWith("FILE") && type === "tree" ? Metric[metric].replace("File", "Folder") : Metric[metric]}
        </p>
      </div>
    </button>
  )
}

function InteractionButtons() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const data = useData()
  const viewAction = useViewAction()
  const [viewSearchParams] = useQueryStates(viewSearchParamsConfig)
  const { state } = useNavigation()
  const { setPath } = usePath()
  const location = useLocation()

  if (!clickedObject) {
    return null
  }

  const isBlob = clickedObject.type === "blob"
  const targetZoomPath = isBlob ? resolveParentFolder(clickedObject.path) : clickedObject.path
  const currentZoomPath = viewSearchParams.zoomPath ?? data.databaseInfo.repo //If no zoomPath, we are at root
  const isSelectedObjectZoomPath = currentZoomPath === targetZoomPath
  const zoomLink = location.pathname + viewSerializer({ ...viewSearchParams, zoomPath: targetZoomPath ?? undefined })
  const extension = last(clickedObject.name.split("."))

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2">
      {!isSelectedObjectZoomPath ? (
        <Link className="btn" to={zoomLink}>
          <Icon path={mdiMagnify} />
          Zoom to {isBlob ? "file" : "folder"}
        </Link>
      ) : null}
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
