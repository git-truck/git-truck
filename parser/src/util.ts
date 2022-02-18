import { spawn } from "child_process"
import { promises as fs } from "fs"
import { resolve, sep } from "path"
import { log } from "./log.js"
import { GitBlobObject, GitCommitObject, GitTreeObject } from "./model.js"

export function last<T>(array: T[]) {
  return array[array.length - 1]
}

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
  outDir: string,
  outFileName: string
) {
  const data = JSON.stringify(commitObject, null, 2)
  let outPath = resolve(outDir, ".temp")
  await fs.mkdir(outPath, { recursive: true })
  const path = resolve(outPath, outFileName)
  await fs.writeFile(path, data)
  log.info(`[${commitObject.hash}] -> ${path}`)
}

export function getRepoName(repoDir: string) {
  return resolve(repoDir).split(sep).slice().reverse()[0]
}

export async function getCurrentBranch(dir: string) {
  return (await runProcess(dir, "git", [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ])) as string
}
