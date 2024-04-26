import type { MetricType } from "../metrics/metrics"
import { Metric } from "../metrics/metrics"
import { EnumSelect } from "./EnumSelect"
import type { ChartType, HierarchyType } from "../contexts/OptionsContext"
import { Chart, Hierarchy, useOptions } from "../contexts/OptionsContext"
import { CheckboxWithLabel } from "./util"
import { Icon } from "@mdi/react"
import { memo, useTransition } from "react"
import anitruck from "~/assets/truck.gif"

import {
  mdiChartBubble,
  mdiChartTree,
  mdiPodiumGold,
  mdiFileCodeOutline,
  mdiUpdate,
  mdiResize,
  mdiSourceCommit,
  mdiScaleBalance,
  mdiAccountAlertOutline,
  mdiTruckFastOutline,
  mdiLink,
  mdiTransition,
  mdiLabel,
  mdiPalette,
  mdiImageSizeSelectSmall,
  mdiPuzzle,
  mdiViewModule,
  mdiCog,
  mdiFileTree,
  mdiFamilyTree,
  mdiContentCut,
  mdiThemeLightDark,
  mdiWhiteBalanceSunny,
  mdiMoonWaningCrescent,
  mdiClockEdit,
  mdiPlusMinusVariant
} from "@mdi/js"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import { SizeMetric } from "~/metrics/sizeMetric"
import { useLocalStorage } from "react-use"
import { Depth, type DepthType, depthTypeIcons } from "~/metrics/chartDepth"
import type { Theme } from "~/styling"
import { Themes, useTheme } from "~/styling"

export const Options = memo(function Options() {
  const [theme, setTheme] = useTheme()
  console.log(theme)
  const {
    metricType,
    chartType,
    depthType,
    sizeMetric,
    hierarchyType,
    transitionsEnabled,
    renderCutoff,
    showFilesWithoutChanges,
    setTransitionsEnabled,
    labelsVisible,
    setLabelsVisible,
    setMetricType,
    setChartType,
    setDepthType,
    setHierarchyType,
    setSizeMetricType,
    setRenderCutoff,
    setShowFilesWithoutChanges
  } = useOptions()

  const [linkMetricAndSizeMetric, setLinkMetricAndSizeMetric] = useLocalStorage<boolean>(
    "LINK_METRIC_AND_SIZE_METRIC",
    false
  )

  const visualizationIcons: Record<MetricType, string> = {
    FILE_TYPE: mdiFileCodeOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_COMMITS: mdiSourceCommit,
    SINGLE_AUTHOR: mdiAccountAlertOutline,
    TOP_CONTRIBUTOR: mdiPodiumGold,
    TRUCK_FACTOR: mdiTruckFastOutline,
    MOST_CONTRIBUTIONS: mdiPlusMinusVariant
  }

  const sizeMetricIcons: Record<SizeMetricType, string> = {
    FILE_SIZE: mdiResize,
    EQUAL_SIZE: mdiScaleBalance,
    MOST_COMMITS: mdiSourceCommit,
    TRUCK_FACTOR: mdiTruckFastOutline,
    LAST_CHANGED: mdiUpdate,
    MOST_CONTRIBS: mdiPlusMinusVariant
  }

  const chartTypeIcons: Record<ChartType, string> = {
    BUBBLE_CHART: mdiChartBubble,
    TREE_MAP: mdiChartTree
  }

  const hiearchyIcons: Record<HierarchyType, string> = {
    NESTED: mdiFileTree,
    FLAT: mdiChartTree
  }

  const themeIcons: Record<Theme, string> = {
    SYSTEM: mdiCog,
    LIGHT: mdiWhiteBalanceSunny,
    DARK: mdiMoonWaningCrescent
  }

  const relatedSizeMetric: Record<MetricType, SizeMetricType> = {
    FILE_TYPE: "FILE_SIZE",
    TRUCK_FACTOR: "TRUCK_FACTOR",
    TOP_CONTRIBUTOR: "TRUCK_FACTOR",
    MOST_COMMITS: "MOST_COMMITS",
    SINGLE_AUTHOR: "TRUCK_FACTOR",
    LAST_CHANGED: "LAST_CHANGED",
    MOST_CONTRIBUTIONS: "MOST_CONTRIBS"
  }

  const [isTransitioning, startTransition] = useTransition()

  return (
    <>
      <div className="card">
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiPuzzle} size="1.25em" />
            Layout
          </legend>
          <EnumSelect
            enum={Chart}
            defaultValue={chartType}
            onChange={(chartType: ChartType) => setChartType(chartType)}
            iconMap={chartTypeIcons}
          />
        </fieldset>
        {/* <div className="card flex flex-col gap-0 rounded-lg px-2"> */}
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiPalette} size="1.25em" />
            Color
          </legend>
          <EnumSelect
            enum={Metric}
            defaultValue={metricType}
            onChange={(metric: MetricType) => {
              setMetricType(metric)
              if (!linkMetricAndSizeMetric) {
                return
              }
              const relatedSizeMetricType = relatedSizeMetric[metric]
              if (relatedSizeMetricType) {
                setSizeMetricType(relatedSizeMetricType)
              }
            }}
            iconMap={visualizationIcons}
          />
        </fieldset>
        {/* <div className="card flex flex-col gap-0 rounded-lg px-2"> */}
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiImageSizeSelectSmall} size="1.25em" />
            Size
          </legend>
          <EnumSelect
            enum={SizeMetric}
            defaultValue={sizeMetric}
            onChange={(sizeMetric: SizeMetricType) => setSizeMetricType(sizeMetric)}
            iconMap={sizeMetricIcons}
          />
        </fieldset>
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiFamilyTree} size="1.25em" />
            Hiearchy
          </legend>
          <EnumSelect
            enum={Hierarchy}
            defaultValue={hierarchyType}
            onChange={(hiearchyType: HierarchyType) => {
              return setHierarchyType(hiearchyType)
            }}
            iconMap={hiearchyIcons}
          />
        </fieldset>
        {hierarchyType === "NESTED" ? (
          <fieldset className="rounded-lg border p-2">
            <legend className="card__title ml-1.5 justify-start gap-2">
              <Icon path={mdiViewModule} size="1.25em" />
              Depth
            </legend>
            <EnumSelect
              enum={Depth}
              defaultValue={depthType}
              onChange={(depthType: DepthType) => setDepthType(depthType)}
              iconMap={depthTypeIcons}
            />
          </fieldset>
        ) : null}
        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiThemeLightDark} size="1.25em" />
            Theme
          </legend>
          <EnumSelect
            enum={Themes}
            defaultValue={theme}
            onChange={(theme: Theme) => setTheme(theme)}
            iconMap={themeIcons}
          />
        </fieldset>

        <fieldset className="rounded-lg border p-2">
          <legend className="card__title ml-1.5 justify-start gap-2">
            <Icon path={mdiCog} size="1.25em" />
            Settings
          </legend>
          <CheckboxWithLabel
            className="text-sm"
            checked={Boolean(linkMetricAndSizeMetric)}
            onChange={(e) => {
              setLinkMetricAndSizeMetric(e.target.checked)
              if (e.target.checked) {
                setSizeMetricType(relatedSizeMetric[metricType])
              }
            }}
            // checkedIcon={mdiLink}
            // uncheckedIcon={mdiLinkOff}
            title="Enable to sync size metric with color metric"
          >
            <Icon className="ml-1.5" path={mdiLink} size="1.25em" />
            <span>Link size and color option</span>
          </CheckboxWithLabel>
          <CheckboxWithLabel
            className="text-sm"
            checked={transitionsEnabled}
            onChange={(e) => setTransitionsEnabled(e.target.checked)}
            title="Disable to improve performance when zooming"
          >
            <Icon className="ml-1.5" path={mdiTransition} size="1.25em" />
            Transitions
          </CheckboxWithLabel>
          <CheckboxWithLabel
            className="text-sm"
            checked={labelsVisible}
            onChange={(e) => setLabelsVisible(e.target.checked)}
            title="Disable to improve performance"
          >
            <Icon className="ml-1.5" path={mdiLabel} size="1.25em" />
            Labels
          </CheckboxWithLabel>
          <CheckboxWithLabel
            className="text-sm"
            checked={showFilesWithoutChanges}
            onChange={(e) => setShowFilesWithoutChanges(e.target.checked)}
            title="Show files that have had no changes in the selected time range"
          >
            <Icon className="ml-1.5" path={mdiClockEdit} size="1.25em" />
            Show files with no activity
          </CheckboxWithLabel>
          <label
            className="label flex w-full items-center justify-start gap-2 text-sm"
            title="Adjust the item rendering size threshold"
          >
            <span className="flex grow items-center gap-2">
              <Icon className="ml-1.5" path={mdiContentCut} size="1.25em" />
              Pixel render cut-off {isTransitioning ? <img src={anitruck} alt="..." className="h-5" /> : ""}
            </span>
            <input
              type="number"
              min={0}
              defaultValue={renderCutoff}
              className="mr-1 w-12 place-self-end border-b-2"
              onChange={(x) => startTransition(() => setRenderCutoff(x.target.valueAsNumber))}
            />
          </label>
        </fieldset>
      </div>
    </>
  )
})
