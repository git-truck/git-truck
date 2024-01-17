import type { HydratedGitBlobObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { isBlob } from "~/util"
import { LegendBarIndicator } from "../util"
import type { MetricLegendProps } from "./Legend"

export type SegmentLegendData = [
  steps: number,
  textGenerator: (n: number) => string,
  colorGenerator: (n: number) => string,
  offsetStepCalc: (blob: HydratedGitBlobObject) => number
]

export function SegmentLegend({ hoveredObject, metricCache }: MetricLegendProps) {
  const [steps, textGenerator, colorGenerator, offsetStepCalc] = metricCache.legend as SegmentLegendData
  const width = 100 / steps

  let arrowVisible = false
  let arrowOffset = 0
  const clickedObject = useClickedObject().clickedObject ?? hoveredObject ?? null

  if (isBlob(clickedObject)) {
    arrowVisible = true
    arrowOffset = width / 2 + width * offsetStepCalc(clickedObject)
  }

  return (
    <>
      <div className="relative">
        <div className="flex">
          {[...Array(steps)].map((_, i) => {
            return steps >= 4 ? (
              <MetricSegment
                key={`legend-${i}`}
                width={width}
                color={colorGenerator(i)}
                text={textGenerator(i)}
                top={i % 2 === 0}
              />
            ) : (
              <TopMetricSegment
                key={`legend-${i}`}
                width={width}
                color={colorGenerator(i)}
                text={textGenerator(i)}
              />
            )
          })}
        </div>
        <LegendBarIndicator offset={arrowOffset} visible={arrowVisible} />
      </div>
    </>
  )
}

interface SegmentMetricProps {
  width: number
  color: string
  text: string
  top: boolean
}

export function MetricSegment({ width, color, text, top }: SegmentMetricProps) {
  if (top)
    return (
      <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
        <div style={{ textAlign: "left", height: "20px", marginBottom: "-6px" }}>{text}</div>
        <div style={{ textAlign: "left", height: "20px", marginBottom: "-2px" }}>{"/"}</div>
        <div style={{ backgroundColor: color, height: "20px" }} />
        <div style={{ textAlign: "left", height: "40px" }} />
      </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
        <div style={{ textAlign: "left", height: "32px" }} />
        <div style={{ backgroundColor: color, height: "20px" }} />
        <div style={{ textAlign: "left", height: "20px", marginTop: "-7px" }}>{"\\"}</div>
        <div style={{ textAlign: "left", height: "20px", marginTop: "-4px" }}>{text}</div>
      </div>
    )
}

interface TopSegmentMetricProps {
  width: number
  color: string
  text: string
}

export function TopMetricSegment({ width, color, text }: TopSegmentMetricProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
      <div style={{ textAlign: "left", height: "20px", marginBottom: "-6px" }}>{text}</div>
      <div style={{ textAlign: "left", height: "20px", marginBottom: "-2px" }}>{"/"}</div>
      <div style={{ backgroundColor: color, height: "20px" }} />
    </div>
  )
}
