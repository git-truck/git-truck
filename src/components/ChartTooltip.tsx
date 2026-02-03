import { useOptions } from "~/contexts/OptionsContext"
import { Tooltip } from "./Tooltip"
import type { GitObject } from "~/shared/model"

export function ChartTooltip({ hoveredObject }: { hoveredObject: GitObject | null }) {
  const { chartType } = useOptions()
  return (
    <Tooltip hoveredObject={hoveredObject} className={chartType === "BUBBLE_CHART" ? "rounded-xl" : "rounded-xs"} />
  )
}
