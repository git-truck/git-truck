import { Spacer } from "./Spacer"
import { LegendEntry, LegendDot, LegendLable } from "./util"

interface LegendFragProps {
  items: [string, [string, number]][]
  show: boolean
}

export function LegendFragment(props: LegendFragProps) {
  if (!props.show) return null
  return (
    <div>
      {props.items.map((legendItem, i) => {
        let [label, [color]] = legendItem
        return (
          <>
            <LegendEntry>
              <LegendDot
                style={{
                  backgroundColor: color,
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
