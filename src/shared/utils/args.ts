import { parseArgs } from "node:util"

const argOptions = {
  help: {
    type: "boolean",
    short: "h"
  },
  log: {
    type: "string",
    short: "l",
    default: process.env.LOG_LEVEL || undefined
  },
  headless: {
    type: "boolean"
  }
} as const

export function parseArgsWithDefaults(rawArgs?: string[]) {
  const args = parseArgs({
    args: rawArgs,
    strict: true,
    allowPositionals: true,
    allowNegative: true,
    options: argOptions
  })

  return { ...args.values, path: args.positionals.length === 0 ? process.cwd() : args.positionals[0] }
}
