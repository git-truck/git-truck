import { spawn } from "child_process"
import { promises as fs } from "fs"
import { resolve, sep } from "path"
import { debugLog } from "./debug.js"
import { GitCommitObject } from "./model.js"

export function runProcess(command: string, args: string[]) {
  return new Promise((resolve, reject) => {
    const prcs = spawn(command, args)
    prcs.stdout.once("data", (data) => resolve(data.toString()))
    prcs.stderr.once("data", (data) => reject(data.toString()))
  })
}

export async function writeCommitObjectToFile(
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
  const [repo] = resolve(dir).split(sep).slice().reverse()

  await fs.mkdir(outPath, { recursive: true })
  const filename = `${repo}_${branch}.json`
  const path = resolve(outPath, filename)
  await fs.writeFile(path, data)
  console.log(`[${commitObject.hash}] -> ${path}`)
}
