import { mdiSvg, mdiNumeric1Box, mdiNumeric2Box, mdiNumeric3Box, mdiNumeric4Box, mdiNumeric5Box } from "@mdi/js"

export type DepthType = keyof typeof Depth

export const Depth = {
  Full: "Full",
  One: "1",
  Two: "2",
  Three: "3",
  Four: "4",
  Five: "5"
}

export const depthTypeIcons: Record<DepthType, string> = {
  Full: mdiSvg,
  One: mdiNumeric1Box,
  Two: mdiNumeric2Box,
  Three: mdiNumeric3Box,
  Four: mdiNumeric4Box,
  Five: mdiNumeric5Box
}
