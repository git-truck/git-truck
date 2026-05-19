import {
  mdiFileOutline,
  mdiFolderOutline,
  mdiEyeOffOutline,
  mdiSourceRepository,
  mdiOpenInNew,
  mdiScaleBalance
} from "@mdi/js"
import byteSize from "byte-size"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Form, href, useFetcher, useNavigation, useSubmit } from "react-router"
import { MetricInspectionPanel, type MetricPanelDropdownButton } from "~/components/inspection/MetricInspectionPanel"
import { Icon } from "~/components/Icon"
import { UNKNOWN_CATEGORY } from "~/const"
import { useOptions } from "~/contexts/OptionsContext"
import { PercentageSlider } from "~/components/PercentageSlider"
import { dateFormatRelative, isDarkColor, isRepositoryRoot, isTree, last, resolveParentFolder } from "~/shared/util"
import {
  useClickedObject,
  useSetClickedObject,
  useObjectColor,
  useClickedObjectPath
} from "~/state/stores/clicked-object"
import { cn } from "~/styling"
import { useViewAction } from "~/hooks"
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
import { useQueryState, useQueryStates } from "nuqs"
import { viewSearchParamsConfig, viewSerializer } from "~/routes/viewParams"
import type { HexColor } from "~/shared/model"
import { ZoomButtons } from "~/components/buttons/ZoomButtons"
import type { loader } from "~/routes/api.metrics"
import { useData } from "~/contexts/DataContext"

export function MetricsInspection() {
  const submit = useSubmit()
  const clickedObject = useClickedObject()
  const { databaseInfo } = useData()
  const { metricType, setMetricType, showTopContributorSlider, setShowTopContributorSlider } = useOptions()
  const viewAction = useViewAction()
  const [modalOpen, setModalOpen] = useState(false)

  const isBlob = clickedObject?.type === "blob"
  const isRepo = isRepositoryRoot(clickedObject)
  const objectColor = useObjectColor(clickedObject)

  const { data, load, reset } = useFetcher<typeof loader>()

  const clickedObjectPath = useClickedObjectPath()

  const [{ path, branch }] = useQueryStates({
    start: viewSearchParamsConfig.start,
    end: viewSearchParamsConfig.end,
    objectPath: viewSearchParamsConfig.objectPath,
    path: viewSearchParamsConfig.path,
    branch: viewSearchParamsConfig.branch
  })

  useEffect(() => {
    load(href("/api/metrics") + viewSerializer({ objectPath: clickedObjectPath, path: path, branch }))
    return () => reset()
  }, [branch, clickedObjectPath, load, path, reset])

  if (!clickedObject) {
    return <p className="p-4">No file or folder selected</p>
  }

  const currentFetcherData = data

  const objectHasChangesInSelectedRange = isBlob
    ? Boolean(databaseInfo.commitCounts[clickedObject.path])
    : currentFetcherData?.existsInRange

  if (objectHasChangesInSelectedRange === false) {
    return <p className="p-4">{isBlob ? "File" : "Folder"} does not exist in selected time range</p>
  }

  const contributions = isBlob
    ? databaseInfo.contribSumPerFile[clickedObject.path]
    : (currentFetcherData?.contributions ?? null)

  const commitCount: number | null = isBlob
    ? databaseInfo.commitCounts[clickedObject.path]
    : currentFetcherData
      ? currentFetcherData.amountOfCommits
      : null

  const lastChanged = isBlob
    ? (dateFormatRelative(databaseInfo.lastChanged[clickedObject.path]) ?? "unknown")
    : currentFetcherData?.lastChanged
      ? dateFormatRelative(currentFetcherData.lastChanged)
      : null

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
      description: commitCount && commitCount === 1 ? "Commit" : "Commits",
      icon: CommitsMetric.icon,
      data: commitCount?.toLocaleString() ?? "loading...",
      inspectionPanels: CommitsMetric.inspectionPanels
    },
    MOST_CONTRIBUTIONS: {
      description: "Line Changes",
      icon: LinesChangedMetric.icon,
      data: isBlob
        ? databaseInfo.contribSumPerFile[clickedObject.path].toLocaleString()
        : contributions
          ? contributions.toLocaleString()
          : "loading",
      inspectionPanels: LinesChangedMetric.inspectionPanels
    },
    CONTRIBUTORS: {
      icon: ContributorsMetric.icon,
      description: "Contributors",
      data: currentFetcherData
        ? (currentFetcherData.contributors?.length.toLocaleString() ?? UNKNOWN_CATEGORY)
        : "loading...",
      inspectionPanels: ContributorsMetric.inspectionPanels
    },
    TOP_CONTRIBUTOR: {
      description: currentFetcherData?.multiTopContributors ? "Top Churners" : "Top Churner",
      icon: TopContributorMetric.icon,
      data: currentFetcherData
        ? currentFetcherData.multiTopContributors
          ? "Multiple people"
          : (currentFetcherData.topContributor[0].contributor ?? UNKNOWN_CATEGORY)
        : "loading...",
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
      data: lastChanged ? lastChanged + " ago" : "loading...",
      inspectionPanels: LastChangedMetric.inspectionPanels
    }
  } as const

  const { inspectionPanels } = metrics[metricType]

  return (
    <>
      <GroupContributorsModal open={modalOpen} onClose={() => setModalOpen(false)} />
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

export function InteractionButtons() {
  const clickedObject = useClickedObject()
  const setClickedObject = useSetClickedObject()
  const viewAction = useViewAction()
  const { state } = useNavigation()
  const [, setZoomPath] = useQueryState("zoomPath", viewSearchParamsConfig.zoomPath)

  if (!clickedObject) {
    return null
  }

  const isRoot = isRepositoryRoot(clickedObject)
  const isBlob = clickedObject.type === "blob"
  const extension = last(clickedObject.name.split("."))

  return (
    <div className="flex flex-wrap">
      <Form method="post" action={viewAction}>
        <input type="hidden" name="open" value={clickedObject.path} />
        <button
          className="btn btn--text"
          disabled={state !== "idle"}
          title={
            clickedObject.type === "blob"
              ? `Open ${clickedObject.name} in default app`
              : `Browse ${clickedObject.name} in system explorer`
          }
        >
          <Icon path={mdiOpenInNew} size="1.25em" className="w-max" />
          {clickedObject.type === "blob" ? "Open" : "Browse"}
        </button>
      </Form>
      <Form
        className="w-max"
        method="post"
        action={viewAction}
        onSubmit={() => {
          if (!isBlob) setZoomPath(resolveParentFolder(clickedObject.path))
          setClickedObject(null)
        }}
      >
        <input type="hidden" name="hide" value={clickedObject.path} />
        {!isRoot ? (
          <button
            className="btn btn--text"
            disabled={state !== "idle"}
            title={`Hide ${clickedObject.name} from visualization`}
          >
            <Icon path={mdiEyeOffOutline} />
            Hide
          </button>
        ) : null}
      </Form>
      {isBlob ? (
        <>
          {clickedObject.name.includes(".") ? (
            <Form className="w-max" method="post" action={viewAction}>
              <input type="hidden" name="hide" value={`*.${extension}`} />
              <button
                className="btn btn--text"
                disabled={state !== "idle"}
                title={`Hide all files with .${extension} extension`}
              >
                <Icon path={mdiEyeOffOutline} />
                <span>Hide *.{extension}</span>
              </button>
            </Form>
          ) : null}
        </>
      ) : null}
      <ZoomButtons />
    </div>
  )
}
