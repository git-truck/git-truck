import type { GitBlobObject } from "~/shared/model"
import { useClickedObject } from "~/state/stores/clicked-object"
import { LegendBarIndicator } from "~/components/util"
import { isBlob } from "~/shared/util"
import { useOptions } from "~/contexts/OptionsContext"
import { cn } from "~/styling"
import { Tick } from "~/components/sliderUtils"
import { useMetrics } from "~/contexts/MetricContext"
import { useHoveredObject } from "~/state/stores/hovered-object"

export type SegmentLegendData = {
  steps: number
  textGenerator: (n: number) => string
  colorGenerator: (n: number) => string
  offsetStepCalc: (blob: GitBlobObject) => number
}

export function SegmentLegend() {
  const hoveredObject = useHoveredObject()
  const { metricType } = useOptions()
  const [metricsData] = useMetrics()

  const metricCache = metricsData.get(metricType)!
  const { steps, textGenerator, colorGenerator, offsetStepCalc } = metricCache.legend as SegmentLegendData
  const width = 100 / steps

  const clickedObject = useClickedObject()
  const clickedArrowOffset = isBlob(clickedObject) ? width / 2 + width * offsetStepCalc(clickedObject) : null
  const hoveredArrowOffset = isBlob(hoveredObject) ? width / 2 + width * offsetStepCalc(hoveredObject) : null

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
          <LegendBarIndicator offset={hoveredArrowOffset ?? 0} visible={hoveredArrowOffset !== null} />
          <LegendBarIndicator offset={clickedArrowOffset ?? 0} visible={clickedArrowOffset !== null} />
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

function MetricSegment({ className = "", width, color, text, top }: SegmentMetricProps) {
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

function TopMetricSegment({ width, color, text }: TopSegmentMetricProps) {
  return (
    <div className="flex flex-col" style={{ width: `${width}%` }}>
      <div className="h-5 truncate text-left">{text}</div>
      <Tick />
      <div className="h-5" style={{ backgroundColor: color }}></div>
    </div>
  )
}
