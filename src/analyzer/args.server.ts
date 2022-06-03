import yargsParser from "yargs-parser"
import { promises as fs } from "fs"
import { resolve } from "path"
import { RefactorInfo, TruckConfig, TruckUserConfig } from "./model"
import { GitCaller } from "./git-caller.server"
import { getBaseDirFromPath } from "./util.server"
import { log } from "./log.server"

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false,
    },
  })
}

export async function getArgsWithDefaults(): Promise<TruckConfig> {
  const args = parseArgs()
  const tempArgs = {
    path: ".",
    hiddenFiles: [] as string[],
    unionedAuthors: [] as string[][],
    invalidateCache: false,
    ...args,
  }

  return tempArgs
}

export async function getTruckConfigWithArgs(repo: string): Promise<[TruckConfig, TruckUserConfig]> {
  const args = await getArgsWithDefaults()

  const pathIsRepo = await GitCaller.isGitRepo(args.path)
  args.path = pathIsRepo ? getBaseDirFromPath(args.path) : args.path  

  let config: TruckUserConfig = {}
  try {
    const configContents = JSON.parse(await fs.readFile(resolve(args.path, repo, "truckconfig.json"), "utf-8"))
    config = configContents
  } catch (e) {
    log.warn(`No truckconfig.json found in repo ${repo}`)
  }

  return [
    {
      ...args,
      ...config,
    },
    config,
  ]
}

export async function getTruckRefactorInfo(repo: string): Promise<RefactorInfo> {
  const args = await getArgsWithDefaults()

  const pathIsRepo = await GitCaller.isGitRepo(args.path)
  args.path = pathIsRepo ? getBaseDirFromPath(args.path) : args.path  

  let info: RefactorInfo = {}
  try {
    const contents = JSON.parse(await fs.readFile(resolve(args.path, repo, "truckrefactor.json"), "utf-8"))
    info = contents
  } catch (e) {
    log.warn(`No truckrefactor.json found in repo ${repo}`)
  }

  return info
}
