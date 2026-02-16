import type { GitBlobObject, GitObject } from "~/shared/model"
import { useClickedObject } from "~/contexts/ClickedContext"
import { LegendBarIndicator } from "../util"
import { isBlob } from "~/shared/util"
import { useOptions } from "~/contexts/OptionsContext"
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

  const metricCache = metricsData.get(metricType)!
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
                key={i}
                className={i === 0 ? "rounded-l-sm" : i === steps - 1 ? "rounded-r-sm" : ""}
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
      <div className="flex flex-col" style={{ width: `${width}%` }}>
        <div className="h-5 truncate text-left" title={text}>
          {text}
        </div>
        <Tick className="ml-1" />
        <div className={cn("h-4", className)} style={{ backgroundColor: color }}></div>
        <Tick className="invisible" />
      </div>
    )
  else
    return (
      <div className="flex flex-col" style={{ width: `${width}%` }}>
        <div className="invisible h-5 text-left">{text}</div>
        <Tick className="invisible" />
        <div className={cn("h-4", className)} style={{ backgroundColor: color }}></div>
        <Tick />
        <div className="h-5 truncate text-left">{text}</div>
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
    <div className="flex flex-col" style={{ width: `${width}%` }}>
      <div className="h-5 truncate text-left">{text}</div>
      <Tick />
      <div className="h-5" style={{ backgroundColor: color }}></div>
    </div>
  )
}
