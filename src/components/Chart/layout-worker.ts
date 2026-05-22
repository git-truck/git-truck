import {
  hierarchy,
  treemap,
  treemapResquarify,
  partition,
  type HierarchyRectangularNode,
  pack,
  type HierarchyCircularNode,
  type HierarchyNode
} from "d3-hierarchy"
import { treemapPaddingInner, treemapPaddingOuter, treemapPaddingTop, letterHeightText, bubblePadding } from "~/const"
import type { LayoutType } from "~/layouts/layouts"
import { getLastChangedBucketIndex, getLastChangedBuckets, type LastChangedBucket } from "~/metrics/lastChangedBuckets"
import type { SizeMetricType } from "~/metrics/sizeMetric"
import type { DatabaseInfo, GitTreeObject, GitObject } from "~/shared/model"
import { isTree } from "~/shared/util"

const weakMap = new WeakMap<GitTreeObject, number>()

onmessage = handleMessage

function handleMessage(event: MessageEvent) {
  console.log("got a message:)")
  // postMessage("polo!")
  postMessage(createPartitionedHiearchy(event.data))
}

function createPartitionedHiearchy({
  databaseInfo,
  tree,
  size,
  chartType,
  sizeMetricType,
  renderCutOff,
  lastChangedBuckets
}: {
  databaseInfo: DatabaseInfo
  tree: GitTreeObject
  size: { height: number; width: number }
  chartType: LayoutType
  sizeMetricType: SizeMetricType
  renderCutOff: number
  lastChangedBuckets?: readonly LastChangedBucket[]
}) {
  const bucketsForLastChanged =
    sizeMetricType === "LAST_CHANGED" ? (lastChangedBuckets ?? getLastChangedBuckets(databaseInfo)) : undefined

  const hiearchy = hierarchy<GitObject>(tree)
    .sum((obj) => {
      if (isTree(obj)) return 0
      switch (sizeMetricType) {
        case "FILE_SIZE":
          return obj.byteSize ?? 1
        case "MOST_COMMITS":
          return databaseInfo.commitCounts[obj.path] ?? 1
        case "EQUAL_SIZE":
          return 1
        case "LAST_CHANGED": {
          const maxIndex = bucketsForLastChanged?.length ?? 0
          return 2 ** (maxIndex - getLastChangedBucketIndex(obj, databaseInfo, bucketsForLastChanged))
        }
        // return (
        //   (databaseInfo.lastChanged[obj.path] ?? databaseInfo.oldestChangeDate + 1) - databaseInfo.oldestChangeDate
        // )
        case "MOST_CONTRIBUTIONS":
          return databaseInfo.contribSumPerFile[obj.path] ?? 1
      }
    })
    .sort((a, b) => (b.value ?? 1) - (a.value ?? 1))

  const cutOff = Number.isNaN(renderCutOff) ? 2 : renderCutOff

  if (chartType === "TREE_MAP" || chartType === "PARTITION") {
    const treeMapPartition =
      chartType === "TREE_MAP"
        ? treemap<GitObject>()
            .size([size.width, size.height])
            .round(true)
            .tile(treemapResquarify)
            .paddingInner(treemapPaddingInner)
            .paddingOuter(treemapPaddingOuter)
            .paddingTop(treemapPaddingTop)
        : partition<GitObject>().size([size.width, size.height]).padding(0)

    const tmPartition = treeMapPartition(hiearchy)

    filterVisualization(tmPartition, (child) => {
      const cast = child as HierarchyRectangularNode<GitObject>
      return cast.x1 - cast.x0 >= cutOff && cast.y1 - cast.y0 >= cutOff
    })

    return tmPartition
  }
  if (chartType === "BUBBLE_CHART") {
    const bubbleChartPartition = pack<GitObject>()
      .size([size.width, size.height - letterHeightText])
      .padding(bubblePadding)
    const bPartition = bubbleChartPartition(hiearchy)
    filterVisualization(bPartition, (child) => {
      const cast = child as HierarchyCircularNode<GitObject>
      return cast.r >= cutOff
    })
    return bPartition
  } else {
    throw new Error("Unknown chart type: " + chartType)
  }
}

function filterVisualization(node: HierarchyNode<GitObject>, filter: (child: HierarchyNode<GitObject>) => boolean) {
  if (node.children) {
    node.children = node.children.filter((c) => filter(c))
  }
  for (const child of node.children ?? []) {
    if ((child.children?.length ?? 0) > 0) filterVisualization(child, filter)
  }
}
