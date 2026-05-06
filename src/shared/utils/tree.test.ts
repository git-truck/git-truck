import { describe, expect, it } from "vitest"
import { flattenTreeIncludeTrees, reduceTree, reduceTreeIncludeTrees } from "./tree"
import type { GitTreeObject, GitBlobObject } from "~/shared/model"

describe("reduceTree", () => {
  const fileA: GitBlobObject = {
    type: "blob",
    hash: "hashA",
    name: "A.txt",
    path: "A.txt",
    extension: "txt",
    byteSize: 10
  }
  const fileB: GitBlobObject = {
    type: "blob",
    hash: "hashB",
    name: "B.txt",
    path: "subdir/B.txt",
    extension: "txt",
    byteSize: 20
  }
  const subTree: GitTreeObject = {
    type: "tree",
    hash: "def456",
    name: "subdir",
    path: "subdir",
    byteSize: 20,
    children: [fileB]
  }
  const root: GitTreeObject = {
    type: "tree",
    hash: "abc123",
    name: "root",
    path: "",
    byteSize: 30,
    children: [fileA, subTree]
  }

  it("should sum file sizes in the tree", () => {
    const sum = reduceTree(root, (prev: number, curr) => prev + (curr.byteSize || 0), 0)
    expect(sum).toBe(30)
  })

  it("should collect all file names", () => {
    const names = reduceTree(root, (prev, curr) => prev.concat(curr.name), [] as string[])
    expect(names).toEqual(["A.txt", "B.txt"])
  })
})

describe("reduceTreeIncludeTrees", () => {
  it("reduces properly", () => {
    const tree = {
      type: "tree",
      byteSize: 1,
      children: [
        {
          type: "tree",
          byteSize: 1,
          children: [
            {
              type: "blob",
              byteSize: 1
            }
          ]
        }
      ]
    } as GitTreeObject

    const sum = reduceTreeIncludeTrees(tree, (prev, curr) => prev + curr.byteSize, 0)
    expect(sum).toBe(3)
  })
})

describe("flattenTreeIncludeTrees", () => {
  it("flattens tree including trees", () => {
    const tree = {
      type: "tree",
      name: "root",
      children: [
        {
          type: "blob",
          name: "file1.txt"
        }
      ]
    } as GitTreeObject

    const flattened = flattenTreeIncludeTrees(tree)
    expect(flattened.length).toBe(2)
    expect(flattened[0].type).toBe("tree")
    expect(flattened[0].name).toBe("root")

    expect(flattened[1].type).toBe("blob")
    expect(flattened[1].name).toBe("file1.txt")
  })
})
