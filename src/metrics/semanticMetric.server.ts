import fs from "fs"
import path from "path"
import type { GitTreeObject } from "~/analyzer/model"

/**
 * Server-side helper to collect file contents from git tree.
 * This must only be called server-side as it uses fs.
 */
export function collectFileContents(repoPath: string, tree: GitTreeObject): Map<string, string> {
  const files = new Map<string, string>()
  collectFileContentsRec(repoPath, tree, files)
  return files
}

function collectFileContentsRec(repoPath: string, tree: GitTreeObject, files: Map<string, string>) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      try {
        const fullPath = path.join(repoPath, child.path)
        const content = fs.readFileSync(fullPath, "utf-8")
        files.set(child.path, content)
      } catch (err) {
        // Skip files we can't read (binary, permissions, etc.)
      }
    } else if (child.type === "tree") {
      collectFileContentsRec(repoPath, child, files)
    }
  }
}
