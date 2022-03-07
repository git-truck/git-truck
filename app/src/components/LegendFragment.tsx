import { PointInfo } from "../metrics"
import { Spacer } from "./Spacer"
import { LegendEntry, LegendDot, LegendLable } from "./util"

interface LegendFragProps {
  items: [string, PointInfo][]
  show: boolean
}

export function LegendFragment(props: LegendFragProps) {
  if (!props.show) return null
  return (
    <>
      {props.items.map((legendItem) => {
        let [label, info] = legendItem
        return (
          <div key={label}>
            <LegendEntry>
              <LegendDot dotColor={info.color} />
              <Spacer horizontal />
              <LegendLable>{label}</LegendLable>
            </LegendEntry>
            <Spacer />
          </div>
        )
      })}
    </>
  )
}
