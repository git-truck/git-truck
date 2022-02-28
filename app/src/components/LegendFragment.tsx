import { Spacer } from "./Spacer"
import { LegendEntry, LegendDot, LegendLable } from "./util"

interface LegendFragProps {
  items: string[]
  show: boolean
}

export function LegendFragment(props: LegendFragProps) {
  if (!props.show) return null
  return (
    <div>
      {props.items.map((legendItem, i) => {
        let [label, color] = legendItem.split("|")
        return (
          <>
            <LegendEntry>
              <LegendDot
                style={{
                  backgroundColor: color,
                }}
              ></LegendDot>
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
