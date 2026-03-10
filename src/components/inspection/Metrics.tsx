import {
  mdiAccountGroup,
  mdiFileOutline,
  mdiPlusMinusVariant,
  mdiPulse,
  mdiResize,
  mdiSourceCommit,
  mdiFolderOutline,
  mdiFileMultipleOutline
} from "@mdi/js"
import byteSize from "byte-size"
import { useQueryState } from "nuqs"
import { useEffect, useState } from "react"
import { useFetcher, href } from "react-router"
import { ContributorsInspection as ContributorsInspection } from "~/components/inspection/ContributorsInspection"
import { CommitsInspection } from "~/components/inspection/CommitsInspection"
import { Icon } from "~/components/Icon"
import { missingInMapColor } from "~/const"
import { useData } from "~/contexts/DataContext"
import { useMetrics } from "~/contexts/MetricContext"
import { useOptions } from "~/contexts/OptionsContext"
import { viewSerializer } from "~/routes/view"
import type { loader } from "~/routes/view.api.contributor-distribution"
import { dateFormatRelative, last } from "~/shared/util"
import { useClickedObject } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import type { MetricType } from "~/metrics/metrics"

export default function Metrics() {
  const fetcher = useFetcher<typeof loader>()
  const [expandedPanelMetric, setExpandedPanelMetric] = useState<string | null>(null)
  const [path] = useQueryState("path")
  const clickedObject = useClickedObject()
  const data = useData()
  const [metricsData] = useMetrics()
  const { metricType, setMetricType } = useOptions()

  const expandablePanels: Record<string, React.ComponentType> = {
    TOP_CONTRIBUTOR: ContributorsInspection,
    MOST_COMMITS: CommitsInspection
  }

  useEffect(() => {
    setExpandedPanelMetric(metricType ? metricType : null)
  }, [clickedObject?.path, metricType])

  useEffect(() => {
    if (!clickedObject) {
      return
    }
    fetcher.load(href("/view/api/contributor-distribution") + viewSerializer({ objectPath: clickedObject?.path, path }))
    return () => {
      fetcher.reset()
    }
    // For some reason, fetcher does not have a stable identity and causes an infinite loop when added to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedObject?.path])

  const isBlob = clickedObject?.type === "blob"

  type NodeWithChildren = {
    type: string
    children?: NodeWithChildren[]
  }

  const countFilesRecursive = (node: NodeWithChildren): number => {
    if (node.type !== "tree") {
      return 1
    }

    return (node.children ?? []).reduce((sum, child): number => {
      if (child.type !== "tree") {
        return sum + 1
      }

      return sum + countFilesRecursive(child)
    }, 0)
  }

  //TODO: Metrics should be resolvable from a single source of truth instead of calculating it here and in the metric calculation
  const Metrics = [
    {
      name: "FILE_TYPE",
      description: "extension",
      icon: isBlob ? mdiFileOutline : mdiFolderOutline,
      data: isBlob ? "." + last(clickedObject.name.split(".")) : "/",
      color: clickedObject ? metricsData.get("FILE_TYPE")?.colormap?.get(clickedObject.path) : missingInMapColor
    },
    //TODO: FileSize should ideally also be a continous color-metric option to create consistency.
    {
      name: isBlob ? "FILE_SIZE" : "FILES",
      description: isBlob ? "File Size" : "Nested Files",
      icon: isBlob ? mdiResize : mdiFileMultipleOutline,
      data: isBlob
        ? clickedObject
          ? byteSize(clickedObject?.sizeInBytes ?? 0).value + " " + byteSize(clickedObject?.sizeInBytes ?? 0).unit
          : "unknown"
        : clickedObject
          ? countFilesRecursive(clickedObject).toLocaleString()
          : "unknown",
      color: missingInMapColor
    },
    {
      name: "MOST_COMMITS",
      description: "# commits",
      icon: mdiSourceCommit,
      data: clickedObject
        ? isBlob
          ? data.databaseInfo.commitCounts[clickedObject.path]
          : Object.entries(data.databaseInfo.commitCounts)
              .filter(([path]) => clickedObject?.path && path.startsWith(clickedObject.path))
              .reduce((sum, [_, count]) => sum + count, 0)
              .toLocaleString()
        : "unknown",
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: clickedObject ? metricsData.get("MOST_COMMITS")?.colormap?.get(clickedObject.path) : missingInMapColor
    },
    {
      name: "TOP_CONTRIBUTOR",
      description: "most line-contributing contributor",
      icon: mdiAccountGroup,
      data: clickedObject
        ? isBlob
          ? (data.databaseInfo.topContributors[clickedObject.path]?.contributor ?? "unknown")
          : fetcher.data
            ? (fetcher.data.contributorDistribution[0]?.contributor ?? "unknown")
            : "loading..."
        : "unknown",
      color: clickedObject ? metricsData.get("TOP_CONTRIBUTOR")?.colormap?.get(clickedObject.path) : missingInMapColor
    },
    {
      name: "MOST_CONTRIBUTIONS",
      description: "# Line changes",
      icon: mdiPlusMinusVariant,
      data: clickedObject
        ? isBlob
          ? data.databaseInfo.contribSumPerFile[clickedObject.path].toLocaleString()
          : Object.entries(data.databaseInfo.contribSumPerFile)
              .filter(([path]) => clickedObject?.path && path.startsWith(clickedObject.path))
              .reduce((sum, [_, count]) => sum + count, 0)
              .toLocaleString()
        : "unknown",
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: clickedObject
        ? metricsData.get("MOST_CONTRIBUTIONS")?.colormap?.get(clickedObject.path)
        : missingInMapColor
    },
    {
      name: "LAST_CHANGED",
      description: "last changed timestamp",
      icon: mdiPulse,
      data: clickedObject
        ? isBlob
          ? (dateFormatRelative(data.databaseInfo.lastChanged[clickedObject.path]) ?? "unknown")
          : (dateFormatRelative(
              Math.max(
                ...Object.entries(data.databaseInfo.lastChanged)
                  .filter(([path]) => clickedObject?.path && path.startsWith(clickedObject.path))
                  .map(([_, epoch]) => epoch)
              )
            ) ?? "unknown")
        : "unknown",
      //TODO: Find a way to determine continous metric colour based on input value with cap of the max of current view.
      color: clickedObject ? metricsData.get("LAST_CHANGED")?.colormap?.get(clickedObject.path) : missingInMapColor
    }
  ]

  const ExpandedPanel = expandedPanelMetric ? expandablePanels[expandedPanelMetric] : undefined

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {Metrics.map((metric) => (
          <MetricButton
            key={metric.name}
            metric={metric}
            metricType={metricType}
            isExpanded={metric.name === expandedPanelMetric}
            onClick={() => {
              setMetricType(metric.name as MetricType)
              setExpandedPanelMetric((prev) => (prev === metric.name ? null : metric.name))
            }}
          />
        ))}
      </div>
      {expandedPanelMetric ? (
        <div className="border-primary mt-3 rounded-md border p-2">
          {ExpandedPanel ? <ExpandedPanel /> : <p>This metric has no inspection currently</p>}
        </div>
      ) : null}
    </>
  )
}

function MetricButton({
  metric,
  metricType,
  isExpanded = false,
  onClick
}: {
  metric: { name: string; description: string; icon: string; data: string | number; color?: string }
  metricType?: string
  isExpanded?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={cn("btn flex h-full w-full flex-row items-center justify-between gap-5 px-2 py-1", {
        "ring-primary ring-2": isExpanded
      })}
      style={{
        ...(metric.color && metric.name == metricType
          ? { backgroundColor: `hsl(from ${metric.color} h s l / 0.7)` }
          : {})
      }}
      onClick={onClick}
    >
      <Icon path={metric.icon} size={0.75} />
      <div className="flex flex-col overflow-hidden text-right">
        <p className="w-full truncate text-sm font-bold">{metric.data}</p>
        <p className="truncate text-[10px] font-normal italic">{metric.name}</p>
      </div>
    </button>
  )
}
