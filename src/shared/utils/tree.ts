import type { GitBlobObject, GitObject, GitTreeObject, ObjectPathMap } from "~/shared/model"
import { getSep, isTree, normalizePath } from "~/shared/util"

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
  let result = reducer(defaultValue, tree)
  for (const child of tree.children) {
    if (isTree(child)) {
      result = reduceTreeIncludeTrees(child, reducer, result)
    } else {
      result = reducer(result, child)
    }
  }
  return result
}

export function filterTree(tree: GitTreeObject, predicate: (node: GitObject) => boolean): GitTreeObject {
  function filterNode(node: GitObject): GitObject | null {
    //It's a GitBlobObject (file)
    if (node.type === "blob") {
      return predicate(node) ? node : null
    }
    //It's a GitTreeObject (directory)
    else {
      const children: GitObject[] = []
      for (const child of node.children) {
        const filteredChild = filterNode(child)
        if (filteredChild !== null) {
          children.push(filteredChild)
        }
      }
      //Discard empty directories
      return children.length === 0 ? null : { ...node, children }
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

export function createObjectPathMap(tree: GitTreeObject): ObjectPathMap {
  const objectPathMap: ObjectPathMap = {}
  const stack: GitObject[] = [tree]

  while (stack.length > 0) {
    const current = stack.pop()

    if (!current) continue

    let newCurrent: Omit<GitObject, "children"> = current

    if (isTree(newCurrent)) {
      const { children: _, ...currentWithoutChildren } = newCurrent
      newCurrent = currentWithoutChildren
    }

    objectPathMap[current.path] = newCurrent

    if (isTree(current)) {
      stack.push(...current.children)
    }
  }

  return objectPathMap
}

export function findInTree(tree: GitTreeObject, predicate: (node: GitObject) => boolean): GitObject | null {
  if (predicate(tree)) {
    return tree
  }

  for (const child of tree.children) {
    if (predicate(child)) {
      return child
    }
    if (child.type === "tree") {
      const found = findInTree(child, predicate)
      if (found) {
        return found
      }
    }
  }
  return tree
}

export function findSubTree(tree: GitTreeObject, path?: string): GitTreeObject {
  if (!path) return tree

  const hasRootPrefix = path === tree.name || path.startsWith(`${tree.name}/`)
  if (!hasRootPrefix) return tree

  let relativePath = path.length === tree.name.length ? "" : path.substring(tree.name.length + 1)
  if (!relativePath) return tree

  relativePath = normalizePath(relativePath)

  let currentTree: GitTreeObject = tree
  const separator = getSep(relativePath)
  const steps = relativePath.split(separator)

  for (let i = 0; i < steps.length; i++) {
    let foundStep = false

    for (const child of currentTree.children) {
      if (child.type === "tree") {
        const childSteps = child.name.split(separator)

        if (childSteps[0] === steps[i]) {
          currentTree = child
          i += childSteps.length - 1
          foundStep = true
          break
        }
      }
    }

    // If a step is not found, abort and return root tree
    if (!foundStep) {
      console.warn(`Could not find step ${steps[i]} in subtree ${currentTree.name}`)
      return tree
    }
  }

  return currentTree
}
