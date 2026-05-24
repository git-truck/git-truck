import { mdiFileOutline, mdiFolderOutline, mdiSourceRepository, mdiScaleBalance } from "@mdi/js"
import byteSize from "byte-size"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { href, useFetcher, useSubmit } from "react-router"
import { MetricInspectionPanel, type MetricPanelDropdownButton } from "~/components/inspection/MetricInspectionPanel"
import { Icon } from "~/components/Icon"
import { UNKNOWN_CATEGORY } from "~/const"
import { useOptions } from "~/contexts/OptionsContext"
import { PercentageSlider } from "~/components/PercentageSlider"
import { dateFormatRelative, isDarkColor, isTree, last } from "~/shared/util"
import { useClickedObject, useObjectColor, useClickedObjectPath } from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { usePathIsRepositoryRoot, useViewAction } from "~/hooks"
import { FileSizeMetric } from "~/metrics/fileSize"
import { ContributorsMetric } from "~/metrics/contributors"
import type {
  MetricPanelActionId,
  MetricPanelConfig,
  MetricPanelDropdownButtonConfig,
  MetricType
} from "~/metrics/metrics"
import { TypeMetric } from "~/metrics/fileExtension"
import { CommitsMetric } from "~/metrics/mostCommits"
import { TopContributorMetric } from "~/metrics/topContributer"
import { LinesChangedMetric } from "~/metrics/linesChanged"
import { LastChangedMetric } from "~/metrics/lastChanged"
import { GroupContributorsModal } from "~/components/modals/GroupContributorsModal"
import { useQueryStates } from "nuqs"
import { viewSearchParamsConfig, viewSerializer } from "~/shared/viewParams"
import type { ClickedObjectInfo, HexColor } from "~/shared/model"
import type { loader } from "~/routes/api.metrics"
import { useData } from "~/contexts/DataContext"
import { CollapsibleHeader } from "~/components/CollapsibleHeader"
import { InspectPanel } from "~/components/inspection/InspectPanel"

export function MetricsInspection() {
  const submit = useSubmit()
  const clickedObject = useClickedObject()
  const { databaseInfo } = useData()
  const { metricType, setMetricType, showTopContributorSlider, setShowTopContributorSlider } = useOptions()
  const viewAction = useViewAction()
  const [modalOpen, setModalOpen] = useState(false)

  const isBlob = clickedObject?.type === "blob"

  const { data, load, reset } = useFetcher<typeof loader>()

  const objectColor = useObjectColor(clickedObject, data ?? null)

  const clickedObjectPath = useClickedObjectPath()
  const isRepo = usePathIsRepositoryRoot(clickedObjectPath)
  const [params] = useQueryStates(viewSearchParamsConfig)
  const [rangeStart, rangeEnd] = databaseInfo.timerange

  useEffect(() => {
    load(
      href("/api/metrics") +
        viewSerializer({
          ...params,
          objectPath: clickedObjectPath,
          start: params.start ?? rangeStart,
          end: params.end ?? rangeEnd
        })
    )
    return () => reset()
  }, [clickedObjectPath, load, params, rangeEnd, rangeStart, reset])

  const currentFetcherData = data

  const selectedRangeMetricsLoaded = isBlob || currentFetcherData !== undefined

  const contributions = isBlob
    ? (databaseInfo.contribSumPerFile[clickedObject.path] ?? 0)
    : currentFetcherData?.contributions

  const commitCount = isBlob
    ? (databaseInfo.commitCounts[clickedObject.path] ?? 0)
    : currentFetcherData?.amountOfCommits

  const lastChanged = isBlob ? databaseInfo.lastChanged[clickedObject.path] : currentFetcherData?.lastChanged
  const contributorCount = currentFetcherData?.contributors?.length

  const panelActionMap = {
    "group-contributors": () => setModalOpen(true),
    "shuffle-colors": () => submit({ rerollColors: "" }, { method: "post", action: viewAction }),
    "toggle-top-contributor-slider": () => setShowTopContributorSlider(!showTopContributorSlider)
  } satisfies Record<MetricPanelActionId, () => void>

  const toPanelMenuItems = (menuItems: MetricPanelDropdownButtonConfig[] = []): MetricPanelDropdownButton[] =>
    menuItems.map((item) => ({
      icon: item.icon,
      label: item.label,
      onClick: panelActionMap[item.actionId]
    }))

  const metrics: Record<
    MetricType,
    {
      description: string
      icon: string
      data: string
      inspectionPanels: MetricPanelConfig[]
    }
  > = {
    FILE_TYPE: {
      description: isTree(clickedObject) ? "Folder type" : "File type",
      icon: isRepo ? mdiSourceRepository : isBlob ? mdiFileOutline : mdiFolderOutline,
      data: isRepo ? "Repository" : isBlob ? "." + last(clickedObject.name.split(".")) : "Directory",
      inspectionPanels: TypeMetric.inspectionPanels
    },
    FILE_SIZE: {
      description: clickedObject.type === "tree" ? "Folder size" : "File size",
      icon: FileSizeMetric.icon,
      data: (() => {
        return byteSize(clickedObject.byteSize).value + " " + byteSize(clickedObject.byteSize).unit
      })(),
      inspectionPanels: FileSizeMetric.inspectionPanels
    },
    MOST_COMMITS: {
      description: commitCount === 1 ? "Commit" : "Commits",
      icon: CommitsMetric.icon,
      data: formatMetricCount(commitCount),
      inspectionPanels: CommitsMetric.inspectionPanels
    },
    MOST_CONTRIBUTIONS: {
      description: "Line Changes",
      icon: LinesChangedMetric.icon,
      data: formatMetricCount(contributions),
      inspectionPanels: LinesChangedMetric.inspectionPanels
    },
    CONTRIBUTORS: {
      icon: ContributorsMetric.icon,
      description: "Contributors",
      data: formatMetricCount(contributorCount),
      inspectionPanels: ContributorsMetric.inspectionPanels
    },
    TOP_CONTRIBUTOR: {
      description: currentFetcherData?.multiTopContributors ? "Top Churners" : "Top Churner",
      icon: TopContributorMetric.icon,
      data: formatTopContributorSummary(currentFetcherData),
      inspectionPanels: [
        //Inject top-contributor slider if toggled
        ...(showTopContributorSlider
          ? [
              {
                title: "Top Cutoff",
                content: PercentageSlider,
                description: "Set line-change threshold for top-churner (else Multiple Contributors).",
                menuItems: [
                  { icon: mdiScaleBalance, label: "Toggle Cutoff Slider", actionId: "toggle-top-contributor-slider" }
                ] as MetricPanelDropdownButtonConfig[]
              }
            ]
          : []),
        ...TopContributorMetric.inspectionPanels
      ]
    },
    LAST_CHANGED: {
      description: "Last change",
      icon: LastChangedMetric.icon,
      data: formatLastChangedSummary(lastChanged, selectedRangeMetricsLoaded),
      inspectionPanels: LastChangedMetric.inspectionPanels
    }
  } as const

  const { inspectionPanels } = metrics[metricType]

  return (
    <>
      <GroupContributorsModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <CollapsibleHeader
        className="card"
        title={() => (
          <>
            Metrics
            <InspectPanel />
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(metrics) as Array<[MetricType, (typeof metrics)[MetricType]]>).map(
            ([metric, { icon, data, description }]) => (
              <MetricButton
                key={metric}
                icon={icon}
                isCurrentMetric={metric === metricType}
                color={objectColor && metric === metricType ? objectColor : undefined}
                onClick={() => void setMetricType(metric)}
              >
                <p className="truncate text-xs font-normal opacity-70">{description}</p>
                <p className="w-full truncate text-sm font-bold" title={data}>
                  {data}
                </p>
              </MetricButton>
            )
          )}
        </div>
      </CollapsibleHeader>
      <CollapsibleHeader
        className="card"
        title={() => (
          <>
            Legend
            <InspectPanel />
          </>
        )}
      >
        {inspectionPanels.map((Panel, i) => (
          <MetricInspectionPanel
            key={i}
            actions={Panel.actions}
            metricMenuItems={toPanelMenuItems(Panel.menuItems)}
            title={Panel.title ?? "default"}
            description={Panel.description ?? "Description not provided."}
          >
            <Panel.content />
          </MetricInspectionPanel>
        ))}
      </CollapsibleHeader>
    </>
  )
}

function MetricButton({
  icon,
  isCurrentMetric,
  children,
  color,
  onClick
}: {
  icon: string
  isCurrentMetric: boolean
  children: ReactNode
  color?: HexColor
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "border-border flex h-full w-full cursor-pointer flex-row items-center justify-between gap-5 rounded border bg-[hsl(from_var(--color,var(--color-secondary-bg))_h_s_l/var(--brightness))] px-2 py-1 shadow-sm transition-colors [--brightness:1] hover:[--brightness:0.6] dark:bg-[hsl(from_var(--color,var(--color-secondary-bg-dark))_h_s_l/var(--brightness))]",
        {
          "ring-primary ring-1": isCurrentMetric
        },
        color ? (isDarkColor(color) ? "text-white" : "text-black") : undefined
      )}
      style={
        {
          // backgroundColor: color ? `hsl(from ${color} h s l / 0.7)` : undefined,
          "--color": color
        } as CSSProperties
      }
      onClick={onClick}
    >
      <Icon path={icon} size={0.75} />
      <div className="flex flex-col overflow-hidden text-right">{children}</div>
    </button>
  )
}

const LOADING_LABEL = "loading..."
const NO_ACTIVITY_LABEL = "No activity"

export function formatTopContributorSummary(
  data: Pick<ClickedObjectInfo, "multiTopContributors" | "topContributor"> | null | undefined
) {
  if (!data) {
    return LOADING_LABEL
  }

  if (data.multiTopContributors) {
    return "Multiple people"
  }

  return data.topContributor[0]?.contributor ?? "No contributors"
}

export function formatMetricCount(value: number | null | undefined) {
  return value == null ? LOADING_LABEL : value.toLocaleString()
}

export function formatLastChangedSummary(epochTimeSecs: number | null | undefined, dataLoaded: boolean) {
  if (epochTimeSecs === undefined || epochTimeSecs === null || epochTimeSecs <= 0) {
    return dataLoaded ? NO_ACTIVITY_LABEL : LOADING_LABEL
  }

  const relativeDate = dateFormatRelative(epochTimeSecs)
  return relativeDate ? `${relativeDate} ago` : UNKNOWN_CATEGORY
}
