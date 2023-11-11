import { useMemo } from "react";
import { CloseButton } from "~/components/util"
import { useClickedObject } from "~/contexts/ClickedContext"
import { useCommitTab } from "~/contexts/CommitTabContext"
import type { MenuItem } from "./MenuTab";
import { MenuTab } from "./MenuTab"
import { GeneralDetailsCard } from "./GeneralDetailsCard";
import { getTextColorFromBackground } from "~/util";
import { useMetrics } from "~/contexts/MetricContext";
import { useOptions } from "~/contexts/OptionsContext";
import { commitDetailsCard } from "./CommitDetailsCard";

export function DetailsCard(props: { className?: string, showUnionAuthorsModal: () => void }) {
  const { setClickedObject, clickedObject } = useClickedObject()
  const { setStartDate, setEndDate } = useCommitTab()
  const { metricType, authorshipType } = useOptions()
  const [ metricsData ] = useMetrics()
  if (!clickedObject) return null
  
   const { backgroundColor, color, lightBackground } = useMemo(() => {
        if (!clickedObject) {
            return {
                backgroundColor: undefined,
                color: undefined,
                lightBackground: undefined,
            }
        }
        const colormap = metricsData[ authorshipType ]?.get(metricType)?.colormap
        const backgroundColor = colormap?.get(clickedObject.path) ?? ("#808080" as `#${ string }`)
        const color = backgroundColor ? getTextColorFromBackground(backgroundColor) : undefined
        return {
            backgroundColor: backgroundColor,
            color: color,
            lightBackground: color === "#000000",
        }
    }, [ clickedObject, metricsData, metricType, authorshipType ])

  const items: Array<MenuItem> = new Array<MenuItem>()
  items.push({
    title: "General",
    content: GeneralDetailsCard({...props, backgroundColor, color, lightBackground }),
  } as MenuItem)
  items.push({
    title: "Commits",
    content: commitDetailsCard(),
  } as MenuItem)
  return (
    <div className="card" 
    style={
                color
                    ? {
                        backgroundColor: backgroundColor,
                        color: color,
                    }
                    : {}
            }>
      <CloseButton
        onClick={ () => {
          setStartDate(null)
          setEndDate(null)
          setClickedObject(null)
        } }
      />
      <br />
      <MenuTab lightBackground= {lightBackground} items={items}></MenuTab>
    </div>
  )
}
