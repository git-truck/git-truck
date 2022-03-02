import { LegendInfo } from "../metrics"
import { Spacer } from "./Spacer"
import { LegendEntry, LegendDot, LegendLable } from "./util"

interface LegendFragProps {
  items: [string, LegendInfo][]
  show: boolean
}

export function LegendFragment(props: LegendFragProps) {
  if (!props.show) return null
  return (
    <div>
      {props.items.map((legendItem, i) => {
        let [label, info] = legendItem
        return (
          <>
            <LegendEntry>
              <LegendDot
                style={{
                  backgroundColor: info.color,
                }}
              />
              <Spacer horizontal />
              <LegendLable>{label}</LegendLable>
            </LegendEntry>
            <Spacer />
          </>
        )
      })}
    </div>
  )
}
