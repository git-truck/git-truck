import yargsParser from "yargs-parser"
import { promises as fs } from "fs"
import { resolve } from "path"
import { TruckConfig, TruckUserConfig } from "./model"

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false,
    },
  })
}

export async function getArgs(): Promise<TruckConfig> {
  const args = parseArgs()
  const tempArgs = {
    path: ".",
    branch: null,
    ignoredFiles: [] as string[],
    unionedAuthors: [] as string[][],
    ...args,
  }

  let config: TruckUserConfig = {}
  try {
    const configContents = JSON.parse(
      await fs.readFile(resolve(tempArgs.path, "truckconfig.json"), "utf-8")
    )
    config = configContents
  } catch (e) {}

  return {
    ...tempArgs,
    ...config,
  } as TruckConfig
}
