import { BubbleChartLayout } from "~/layouts/BubbleChartLayout"
import { TreeMapLayout } from "~/layouts/TreeMapLayout"
import { PartitionLayout } from "~/layouts/PartitionLayout"

export type Layout = {
  name: string
  icon: string
}

/**
 * Defines the available layouts in the application
 */
export const Layouts = {
  BUBBLE_CHART: BubbleChartLayout,
  TREE_MAP: TreeMapLayout,
  PARTITION: PartitionLayout
}
export type LayoutType = keyof typeof Layouts

export const LayoutGroups = {
  BUBBLE_CHART: "Bubble chart",
  TREE_MAP: "Tree map",
  PARTITION: "Partition"
} as const
