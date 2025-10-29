import type { GitBlobObject, GitObject } from "~/shared/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { LegendBarIndicator } from "../util"
import { isBlob } from "~/shared/util"
import { useOptions } from "~/contexts/OptionsContext"
import { getMetricLegendType } from "~/metrics/metrics"
import { cn } from "~/styling"
import { Tick } from "../sliderUtils"
import { useMetrics } from "~/contexts/MetricContext"

export type SegmentLegendData = {
  steps: number
  textGenerator: (n: number) => string
  colorGenerator: (n: number) => string
  offsetStepCalc: (blob: GitBlobObject) => number
}

export function SegmentLegend({ hoveredObject }: { hoveredObject: GitObject | null }) {
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData.get(metricType)

  if (metricCache === undefined) throw new Error("Metric cache is undefined")
  if (getMetricLegendType(metricType) !== "SEGMENTS") {
    throw new Error(`SegmentLegend expects metricType to be SEGMENTS, got ${metricType}`)
  }
  const { steps, textGenerator, colorGenerator, offsetStepCalc } = metricCache.legend as SegmentLegendData
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
        <div className="relative flex text-xs whitespace-nowrap">
          {[...Array(steps)].map((_, i) => {
            return steps >= 4 ? (
              <MetricSegment
                className={i === 0 ? "rounded-l-sm" : i === steps - 1 ? "rounded-r-sm" : ""}
                key={i}
                width={width}
                color={colorGenerator(i)}
                text={textGenerator(i)}
                top={i % 2 === 0}
              />
            ) : (
              <TopMetricSegment key={i} width={width} color={colorGenerator(i)} text={textGenerator(i)} />
            )
          })}
          <LegendBarIndicator offset={arrowOffset} visible={arrowVisible} />
        </div>
      </div>
    </>
  )
}

interface SegmentMetricProps {
  className?: string
  width: number
  color: string
  text: string
  top: boolean
}

export function MetricSegment({ className = "", width, color, text, top }: SegmentMetricProps) {
  if (top)
    return (
      <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
        <div style={{ textAlign: "left", height: "20px" }}>{text}</div>
        <Tick className="ml-1" />
        <div className={cn("h-4", className)} style={{ backgroundColor: color }}></div>
        <Tick className="invisible" />
      </div>
    )
  else
    return (
      <div style={{ display: "flex", flexDirection: "column", width: `${width}%` }}>
        {/* <div style={{ textAlign: "left", height: "32px" }}></div> */}
        <div className="invisible" style={{ textAlign: "left", height: "20px" }}>
          {text}
        </div>
        <Tick className="invisible" />
        <div className={cn("h-4", className)} style={{ backgroundColor: color }}></div>
        <Tick />
        <div style={{ textAlign: "left", height: "20px" }}>{text}</div>
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
      <div style={{ textAlign: "left", height: "20px" }}>{text}</div>
      <Tick />
      <div style={{ backgroundColor: color, height: "20px" }}></div>
    </div>
  )
}
