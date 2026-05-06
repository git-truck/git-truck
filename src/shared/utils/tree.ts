import type { GitBlobObject, GitObject, GitTreeObject } from "~/shared/model"
import { isTree } from "~/shared/util"

export function reduceTree<T>(tree: GitTreeObject, reducer: (prev: T, curr: GitBlobObject) => T, defaultValue: T): T {
  return tree.children.reduce((prev, current) => {
    if (isTree(current)) {
      return reduceTree(current, reducer, prev)
    }
    return reducer(prev, current)
  }, defaultValue)
}

export function reduceTreeIncludeTrees<T>(
  tree: GitTreeObject,
  reducer: (prev: T, curr: GitTreeObject | GitBlobObject) => T,
  defaultValue: T
): T {
  return flattenTreeIncludeTrees(tree).reduce((prev, current) => {
    return reducer(prev, current)
  }, defaultValue)
}

export function filterTree(tree: GitTreeObject, predicate: (node: GitObject) => boolean): GitTreeObject {
  function filterNode(node: GitObject): GitObject | null {
    //It's a GitBlobObject (file)
    if (node.type === "blob") {
      return predicate(node) ? node : null
    }

    else {
      const children: GitObject[] = []
      for (const child of node.children) {
        const filteredChild = filterNode(child)
        if (filteredChild !== null) {
          children.push(filteredChild)
        }
      }

      // Discard empty directories
      return children.length === 0 ? null : ({ ...node, children } satisfies GitTreeObject)
    }
  }

  let filteredTree = filterNode(tree)
  if (filteredTree === null) filteredTree = { ...tree, children: [] }
  if (filteredTree.type !== "tree") {
    throw new Error("Filtered tree must be a tree structure")
  }

  return filteredTree
}

export function flattenTree(tree: GitTreeObject) {
  const flattened: GitBlobObject[] = []
  for (const child of tree.children) {
    if (child.type === "blob") {
      flattened.push(child)
    } else {
      flattened.push(...flattenTree(child))
    }
  }
  return flattened
}

export function flattenTreeIncludeTrees(tree: GitTreeObject) {
  const flattened: GitObject[] = [tree]
  for (const child of tree.children) {
    if (child.type === "blob") {
      flattened.push(child)
    } else {
      flattened.push(...flattenTreeIncludeTrees(child))
    }
  }
  return flattened
}
