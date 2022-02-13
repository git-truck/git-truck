import { spawn } from "child_process"
import { promises as fs } from "fs"
import { resolve, sep } from "path"
import { GitCommitObject } from "./model"

export function runProcess(command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    const prcs = spawn(command, args)
    prcs.stdout.once("data", (data) => resolve(data.toString()))
    prcs.stderr.once("data", (data) => reject(data.toString()))
  })
}

export async function writeTreeToFile(
  commitObject: GitCommitObject,
  dir: string,
  branch: string,
  outFile?: string | undefined
) {
  const data = JSON.stringify(commitObject)
  let outPath = resolve(".temp")
  if (outFile) {
    outPath = outFile
  }
  const [repo] = dir.split(sep).slice().reverse()

  await fs.mkdir(outPath, { recursive: true })
  await fs.writeFile(resolve(outPath, `${repo}_${branch}.json`), data)
}
