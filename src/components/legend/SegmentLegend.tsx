import type { GitBlobObject } from "~/analyzer/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import type { MetricLegendProps } from "./Legend"
import { LegendBarIndicator } from "../util"
import { isBlob } from "~/util"

export type SegmentLegendData = [
  steps: number,
  textGenerator: (n: number) => string,
  colorGenerator: (n: number) => string,
  offsetStepCalc: (blob: GitBlobObject) => number
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
        <div className="flex whitespace-nowrap">
          {[...Array(steps)].map((_, i) => {
            return steps >= 4 ? (
              <MetricSegment
                key={`legend-${i}`}
                width={width}
                color={colorGenerator(i)}
                text={textGenerator(i)}
                top={i % 2 === 0}
              ></MetricSegment>
            ) : (
              <TopMetricSegment
                key={`legend-${i}`}
                width={width}
                color={colorGenerator(i)}
                text={textGenerator(i)}
              ></TopMetricSegment>
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
        <div style={{ backgroundColor: color, height: "20px" }}></div>
        <div style={{ textAlign: "left", height: "40px" }}></div>
      </div>
    )
  else
    return (
      <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
        <div style={{ textAlign: "left", height: "32px" }}></div>
        <div style={{ backgroundColor: color, height: "20px" }}></div>
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
      <div style={{ backgroundColor: color, height: "20px" }}></div>
    </div>
  )
}
