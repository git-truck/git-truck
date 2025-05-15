import { describe, expect, it } from "vitest"
import { extractFileExtension } from "./file-util.server"

describe("extractFileExtensions", () => {
  it("extracts file extensions", () => {
    const fileList = [
      "file1.js" ,
      "file2.ts" ,
      "file3.js" ,
      "file4.ts" ,
      "file5.py",
    ]

    const extensions = fileList.map(extractFileExtension)

    expect(extensions).toEqual([".js", ".ts", ".js", ".ts", ".py"])
  })

  it("defaults to basename, if no extensions", () => {
    const fileList = [
      "file1" ,
      "this/makefile" ,
      "other/Dockerfile" ,
      "hello/.gitignore" ,
    ]

    const extensions = fileList.map(extractFileExtension)

    expect(extensions).toEqual(["file1", "makefile", "dockerfile", ".gitignore"])
  })
})
