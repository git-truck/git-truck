import { create } from "zustand"
import type { RawGitObject } from "~/shared/model"

export type HoveredBarTooltip = {
  label: string
  totalCommitCount: number
  totalObjectName: string
  clickedObjectName: string | null
  clickedCommitCount: number | null
  contributors: { name: string; color: string; commitCount: number }[]
}

export function formatCommitCount(count: number) {
  return `${count.toLocaleString()} commit${count !== 1 ? "s" : ""}`
}

export function getHoveredBarTooltipLines(tooltip: HoveredBarTooltip) {
  const lines = [tooltip.label, `${formatCommitCount(tooltip.totalCommitCount)} to ${tooltip.totalObjectName}`]

  if (tooltip.clickedCommitCount !== null && tooltip.clickedObjectName) {
    lines.push(`${formatCommitCount(tooltip.clickedCommitCount)} to ${tooltip.clickedObjectName}`)
  }

  return lines
}

export function getHoveredBarTooltipAriaLabel(tooltip: HoveredBarTooltip) {
  return getHoveredBarTooltipLines(tooltip).join("\n")
}

type HoveredObjectState = {
  hoveredObject: RawGitObject | null
  hoveredBarTooltip: HoveredBarTooltip | null
  setHoveredObject: (hoveredObject: RawGitObject | null) => void
  setHoveredBarTooltip: (hoveredBarTooltip: HoveredBarTooltip | null) => void
  resetHoveredObject: () => void
}

const useHoveredObjectStore = create<HoveredObjectState>()((set) => ({
  hoveredObject: null,
  hoveredBarTooltip: null,
  setHoveredObject: (hoveredObject: RawGitObject | null) => {
    return set({ hoveredObject, hoveredBarTooltip: null })
  },
  setHoveredBarTooltip: (hoveredBarTooltip: HoveredBarTooltip | null) => {
    return set({ hoveredBarTooltip, hoveredObject: null })
  },
  resetHoveredObject: () => set({ hoveredObject: null, hoveredBarTooltip: null })
}))

export const useHoveredObject = () => useHoveredObjectStore((state) => state.hoveredObject)
export const useHoveredBarTooltip = () => useHoveredObjectStore((state) => state.hoveredBarTooltip)
export const useSetHoveredObject = () => useHoveredObjectStore((state) => state.setHoveredObject)
export const useSetHoveredBarTooltip = () => useHoveredObjectStore((state) => state.setHoveredBarTooltip)
