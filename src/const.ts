import { schemeTableau10 } from "d3"
import type { HexColor } from "~/shared/model"

export const letterWidthForTreeText = 7.3
export const letterWidthForBlobText = 7
export const letterHeightText = 16

export const treemapPaddingInner = 2
export const treemapPaddingOuter = 4
export const treemapPaddingTop = 21
export const treemapTreeBorderRadius = 8
export const treemapBlobBorderRadius = 4

export const bubblePadding = 5
export const clipPathPadding = 10
export const circleTreeTextOffsetY = letterHeightText - 1
export const circleBlobTextOffsetY = letterHeightText + 0

export const categoricalScheme: Array<HexColor> = schemeTableau10.slice(0, -1) as Array<HexColor>

export const noEntryColor: HexColor = schemeTableau10.at(-1) as HexColor
// export const noEntryColor: HexColor = "#c0c0c0" as const
export const missingInMapColor = "#c0c0c0" as const

export const MULTIPLE_CONTRIBUTORS = "Multiple contributors" as const
export const UNKNOWN_CATEGORY = "Unknown" as const
// Configuration for how many tree levels to cache below project root
export const METRICS_HIERARCHY_CACHE_DEPTH = 1
