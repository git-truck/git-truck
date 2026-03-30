import { describe, expect, it } from "vitest"
import { reduceTree } from "./tree"
import type { GitTreeObject, GitBlobObject } from "~/shared/model"

describe("reduceTree", () => {
  const fileA: GitBlobObject = {
    type: "blob",
    hash: "hashA",
    name: "A.txt",
    path: "A.txt",
    extension: "txt",
    sizeInBytes: 10
  }
  const fileB: GitBlobObject = {
    type: "blob",
    hash: "hashB",
    name: "B.txt",
    path: "subdir/B.txt",
    extension: "txt",
    sizeInBytes: 20
  }
  const subTree: GitTreeObject = {
    type: "tree",
    hash: "def456",
    name: "subdir",
    path: "subdir",
    children: [fileB]
  }
  const root: GitTreeObject = {
    type: "tree",
    hash: "abc123",
    name: "root",
    path: "",
    children: [fileA, subTree]
  }

  it("should sum file sizes in the tree", () => {
    const sum = reduceTree(root, (prev: number, curr) => prev + (curr.sizeInBytes || 0), 0)
    expect(sum).toBe(30)
  })

  it("should collect all file names", () => {
    const names = reduceTree(root, (prev, curr) => prev.concat(curr.name), [] as string[])
    expect(names).toEqual(["A.txt", "B.txt"])
  })
})
