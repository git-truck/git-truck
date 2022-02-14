import { spawn } from "child_process"
import { promises as fs } from "fs"
import { resolve, sep } from "path"
import {
  GitBlobObject,
  GitCommitObject,
  GitTreeObject,
} from "./model.js"

export const last = (r: unknown[]) => r[r.length - 1]

export function runProcess(dir: string, command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    const prcs = spawn(command, args, {
      cwd: dir,
    })
    prcs.stdout.once("data", (data) => resolve(data.toString()))
    prcs.stderr.once("data", (data) => reject(data.toString()))
  })
}

export async function gitDiffNumStatParsed(repo: string, a: string, b: string) {
  let diff = await gitDiffNumStat(repo, a, b)
  let entries = diff.split("\n")
  let stuff = entries
    .filter((x) => x.trim().length > 0)
    .map((x) => x.split(/\t+/))
    .map(([neg, pos, file]) => ({
      neg: parseInt(neg),
      pos: parseInt(pos),
      file,
    }))
  return stuff
}

export async function lookupFileInTree(
  tree: GitTreeObject,
  path: string
): Promise<GitBlobObject | undefined> {
  let dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find(
      (x) => x.name === file && x.type === "blob"
    )
    if (!result) return
    if (result.type === "tree") return undefined
    return result
  }
  let subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return await lookupFileInTree(subtree, dirs.slice(1).join("/"))
}

export async function gitDiffNumStat(repoDir: string, a: string, b: string) {
  const result = await runProcess(repoDir, "git", ["diff", "--numstat", a, b])
  return result as string
}

export async function deflateGitObject(repo: string, hash: string) {
  const result = await runProcess(repo, "git", ["cat-file", "-p", hash])
  return result as string
}

export async function writeRepoToFile(
  commitObject: GitCommitObject,
  repoDir: string,
  branch: string,
  outDir: string
) {
  const data = JSON.stringify(commitObject, null, 2)
  let outPath = resolve(outDir, ".temp")
  const [repo] = resolve(repoDir).split(sep).slice().reverse()

  await fs.mkdir(outPath, { recursive: true })
  const branchName = last(branch.split(/[\\/]/))
  const filename = `${repo}_${branchName}.json`
  const path = resolve(outPath, filename)
  await fs.writeFile(path, data)
  console.log(`[${commitObject.hash}] -> ${path}`)
}

