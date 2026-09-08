import { useState } from "react"
import { useSubmit } from "react-router"
import { MetricInspectionPanel, type MetricPanelDropdownButton } from "~/components/inspection/MetricInspectionPanel"
import { useOptions } from "~/contexts/OptionsContext"
import { useViewAction } from "~/hooks"
import { Metrics, type MetricPanelActionId, type MetricPanelDropdownButtonConfig } from "~/metrics/metrics"
import { GroupContributorsModal } from "~/components/modals/GroupContributorsModal"
import { Icon } from "~/components/Icon"
import { useData } from "~/contexts/DataContext"

export function Legend({ simplified = false }: { simplified?: boolean }) {
  const submit = useSubmit()
  const { metricType, showTopContributorSlider, setShowTopContributorSlider } = useOptions()
  const { databaseInfo } = useData()
  const viewAction = useViewAction()
  const [modalOpen, setModalOpen] = useState(false)

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

  const { icon, inspectionPanels } = Metrics[metricType]

  return (
    <>
      <GroupContributorsModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {inspectionPanels
        .filter((p) => !(p.id === "top-contributor-slider" && !showTopContributorSlider))
        .map((Panel, i) =>
          simplified ? (
            <div key={`${metricType}:${Panel.id}`} className="card poster-legend flex flex-col gap-2 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                {i === 0 ? <span>LEGEND:</span> : null}
                {i === 0 ? <Icon path={icon} /> : null}
                {i === 0 ? `Contributors to ${databaseInfo.repo}` : Panel.title}
              </div>
              <Panel.content />
            </div>
          ) : (
            <MetricInspectionPanel
              key={`${metricType}:${Panel.id}`}
              actions={Panel.actions}
              metricMenuItems={toPanelMenuItems(Panel.menuItems)}
              title={
                <div className="flex items-center gap-2">
                  {i === 0 ? <Icon path={icon} /> : null}
                  {Panel.title}
                </div>
              }
              description={Panel.description ?? "Description not provided."}
            >
              <Panel.content />
            </MetricInspectionPanel>
          )
        )}
    </>
  )
}
