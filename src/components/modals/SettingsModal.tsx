import { CheckboxWithLabel } from "~/components/modals/utils/CheckboxWithLabel"
import { getDefaultOptionsContextValue, useOptions } from "~/contexts/OptionsContext"
import { Icon } from "~/components/Icon"
import { mdiClockEdit, mdiContentCut, mdiFileTree, mdiFilter, mdiLabel, mdiLink, mdiTransition } from "@mdi/js"
import { useState, useTransition } from "react"
import anitruck from "~/assets/truck.gif"
import { relatedSizeMetric } from "~/components/Options"

export function SettingsModal() {
  const {
    metricType,
    hierarchyType,
    transitionsEnabled,
    showFilesWithoutChanges,
    linkMetricAndSizeMetric,
    showOnlySearchMatches,
    setLinkMetricAndSizeMetric,
    setTransitionsEnabled,
    labelsVisible,
    setLabelsVisible,
    setHierarchyType,
    setSizeMetricType,
    setShowFilesWithoutChanges,
    setShowOnlySearchMatches
  } = useOptions()

  return (
    <>
      <div className="flex min-h-0 max-w-max flex-col items-start gap-3 overflow-y-auto p-2 pl-0">
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={Boolean(linkMetricAndSizeMetric)}
          title="Enable to sync size metric with color metric"
          onChange={(e) => {
            setLinkMetricAndSizeMetric(e.target.checked)
            if (e.target.checked) {
              setSizeMetricType(relatedSizeMetric[metricType])
            }
          }}
        >
          <Icon className="ml-1.5" path={mdiLink} size="1.25em" />
          <span className="flex-1">Link size and color option</span>
        </CheckboxWithLabel>
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={transitionsEnabled}
          title="Disable to improve performance when zooming"
          onChange={(e) => setTransitionsEnabled(e.target.checked)}
        >
          <Icon className="ml-1.5" path={mdiTransition} size="1.25em" />
          <span className="flex-1">Transitions</span>
        </CheckboxWithLabel>
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={labelsVisible}
          title="Disable to improve performance"
          onChange={(e) => setLabelsVisible(e.target.checked)}
        >
          <Icon className="ml-1.5" path={mdiLabel} size="1.25em" />
          <span className="flex-1">Labels</span>
        </CheckboxWithLabel>
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={showFilesWithoutChanges}
          title="Show files that have had no changes in the selected time range"
          onChange={(e) => setShowFilesWithoutChanges(e.target.checked)}
        >
          <Icon className="ml-1.5" path={mdiClockEdit} size="1.25em" />
          <span className="flex-1">Show files with no activity</span>
        </CheckboxWithLabel>
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={hierarchyType === "FLAT"}
          title="Show all files on the same level, instead of as a file tree"
          onChange={() => {
            if (hierarchyType === "FLAT") setHierarchyType("NESTED")
            else setHierarchyType("FLAT")
          }}
        >
          <Icon className="ml-1.5" path={mdiFileTree} size="1.25em" />
          <span className="flex-1">Flatten file tree</span>
        </CheckboxWithLabel>
        {/* <CheckboxWithLabel
        className="text-sm"
        checked={theme === "DARK"}
        onChange={() => {
          if (theme === "DARK") setTheme("LIGHT")
          else setTheme("DARK")
        }}
        title="Use a dark theme instead of light"
      >
        <Icon className="ml-1.5" path={mdiThemeLightDark} size="1.25em" />
        Use dark theme
      </CheckboxWithLabel> */}
        <CheckboxWithLabel
          className="group text-sm hover:text-blue-500 hover:opacity-100"
          checked={showOnlySearchMatches}
          title="When searching, hide files that do not match the search query"
          onChange={(e) => setShowOnlySearchMatches(e.target.checked)}
        >
          <Icon className="ml-1.5" path={mdiFilter} size="1.25em" />
          Show only search matches
        </CheckboxWithLabel>
        <RenderCutOff />
      </div>
    </>
  )
}
function RenderCutOff() {
  const { renderCutOff, setRenderCutOff } = useOptions()
  const [value, setValue] = useState(renderCutOff)
  const [isTransitioning, startTransition] = useTransition()
  return (
    <label
      className="label group flex w-full items-center justify-start gap-2 text-sm hover:text-blue-500 hover:opacity-100"
      title="Increase to improve render performance, decrease it to get higher level of detail"
    >
      <span className="group flex grow items-center gap-2">
        <Icon className="ml-1.5" path={mdiContentCut} size="1.25em" />
        Pixel render cut-off {isTransitioning ? <img src={anitruck} alt="" aria-hidden="true" className="h-5" /> : ""}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        className="mr-1 w-12 place-self-end border-b-2"
        onChange={(x) => {
          const v = Number.isNaN(x.target.valueAsNumber)
            ? getDefaultOptionsContextValue().renderCutOff
            : x.target.valueAsNumber
          setValue(v)
          startTransition(() => setRenderCutOff(v))
        }}
      />
    </label>
  )
}
