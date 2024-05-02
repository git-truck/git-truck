import yargsParser from "yargs-parser"
import type { ArgsOptions } from "./model"
import { GitCaller } from "./git-caller.server"
import { getBaseDirFromPath } from "./util.server"

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false
    }
  })
}

export function getArgsWithDefaults(): ArgsOptions {
  const args = parseArgs()
  const tempArgs = {
    path: ".",
    ...args
  }

  return tempArgs
}

export async function getArgs(): Promise<ArgsOptions> {
  const args = getArgsWithDefaults()

  const pathIsRepo = await GitCaller.isGitRepo(args.path)
  args.path = pathIsRepo ? getBaseDirFromPath(args.path) : args.path

  return args
}

export async function getTruckConfigWithArgsFromPath(repoPath: string): Promise<[TruckConfig, TruckUserConfig]> {
  const args = getArgsWithDefaults()

  const pathIsRepo = await GitCaller.isGitRepo(args.path)
  args.path = pathIsRepo ? getBaseDirFromPath(repoPath) : repoPath

  let config: TruckUserConfig = {}
  try {
    const configContents = JSON.parse(await fs.readFile(resolve(repoPath, "truckconfig.json"), "utf-8"))
    config = configContents
  } catch (e) {
    log.warn(`No truckconfig.json found in repo ${repoPath}`)
  }

  return [
    {
      ...args,
      ...config
    },
    config
  ]
}
