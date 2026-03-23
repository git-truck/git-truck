import {
  mdiAccountGroup,
  mdiFileOutline,
  mdiPlusMinusVariant,
  mdiPulse,
  mdiResize,
  mdiSourceCommit,
  mdiFolderOutline,
  mdiEyeOffOutline,
  mdiMagnify
} from "@mdi/js"
import byteSize from "byte-size"
import { useQueryState, useQueryStates } from "nuqs"
import { useEffect, type ReactNode } from "react"
import { useFetcher, href, Form, Link, useNavigation, useLocation } from "react-router"
import { ContributorsInspection as ContributorsInspection } from "~/components/inspection/ContributorsInspection"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import { Icon } from "~/components/Icon"
import { missingInMapColor } from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.inspect.metrics"
import { dateFormatRelative, last, resolveParentFolder } from "~/shared/util"
import { useClickedObject, useSetClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { useViewAction } from "~/hooks"
import { usePath } from "~/contexts/PathContext"
import type { GitObject, HexColor } from "~/shared/model"
import { Metric, type MetricType } from "~/metrics/metrics"

export default function Metrics() {
  const fetcher = useFetcher<typeof loader>()
  const [path] = useQueryState("path")
  const clickedObject = useClickedObject()
  const data = useData()
  const [metricsData, contributorColors] = useMetrics()
  const { metricType, setMetricType } = useOptions()

  const isBlob = clickedObject?.type === "blob"

  const expandablePanels: Record<string, React.ComponentType> = {
    TOP_CONTRIBUTOR: ContributorsInspection,
    MOST_COMMITS: CommitsInspection
  }

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
      color?: HexColor
    }
  > = {
    FILE_TYPE: {
      description: "extension",
      icon: isBlob ? mdiFileOutline : mdiFolderOutline,
      data: isBlob ? "." + last(clickedObject.name.split(".")) : "/",
      color: metricsData.get("FILE_TYPE")?.colormap?.get(clickedObject.path)
    },
    FILE_SIZE: {
      description: isBlob ? "File Size" : "Nested Files",
      icon: mdiResize,
      data: isBlob
        ? byteSize(clickedObject.sizeInBytes ?? 0).value + " " + byteSize(clickedObject.sizeInBytes ?? 0).unit
        : byteSize(sumFileSizeRecursive(clickedObject) ?? 0).value +
          " " +
          byteSize(sumFileSizeRecursive(clickedObject) ?? 0).unit,
      color: missingInMapColor
    },
    MOST_COMMITS: {
      description: "# commits",
      icon: mdiSourceCommit,
      data: isBlob
        ? formatCount(data.databaseInfo.commitCounts[clickedObject.path])
        : currentFetcherData
          ? currentFetcherData.amountOfCommits
          : "loading...",
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: metricsData.get("MOST_COMMITS")?.colormap?.get(clickedObject.path)
    },
    TOP_CONTRIBUTOR: {
      description: "most line-contributing contributor",
      icon: mdiAccountGroup,
      data: currentFetcherData ? (currentFetcherData.topContributor?.contributor ?? "unknown") : "loading...",
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
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: metricsData.get("LAST_CHANGED")?.colormap?.get(clickedObject.path)
    }
  } as const

  const ExpandedPanel = expandablePanels[metricType] ?? null

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
      <div className="border-primary mt-3 rounded-md border p-2">
        {ExpandedPanel ? <ExpandedPanel key={clickedObject.path} /> : <p>This metric has no inspection currently</p>}
      </div>
      <InteractionButtons />
    </>
  )
}

function MetricButton({
  icon,
  metric,
  children,
  color,
  metricType,
  onClick
}: {
  metric: MetricType
  icon: string
  children: ReactNode
  path: string
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
        <p className="truncate text-[10px] font-normal italic">{Metric[metric]}</p>
      </div>
    </button>
  )
}

function InteractionButtons() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const viewAction = useViewAction()
  const [viewSearchParams] = useQueryStates(viewSearchParamsConfig)
  const { state } = useNavigation()
  const location = useLocation()
  const zoomLink = location + viewSerializer({ ...viewSearchParams, zoomPath: clickedObject?.path })
  const extension = clickedObject ? last(clickedObject.name.split(".")) : undefined
  const isBlob = clickedObject?.type === "blob"
  const { setPath } = usePath()

  if (!clickedObject) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2">
      <Link className="btn" to={zoomLink}>
        <Icon path={mdiMagnify} />
        Zoom to {isBlob ? "file" : "folder"}
      </Link>
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
