import type { GitBlobObject, GitTreeObject } from "~/shared/model"
import { isTree } from "~/shared/util"

export function reduceTree<T>(tree: GitTreeObject, reducer: (prev: T, curr: GitBlobObject) => T, defaultValue: T): T {
  return tree.children.reduce((prev, curr) => {
    if (isTree(curr)) {
      return reduceTree(curr, reducer, prev)
    }
    return reducer(prev, curr)
  }, defaultValue)
}
