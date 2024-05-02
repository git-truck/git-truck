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
