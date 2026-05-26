import { parseArgs, type ParseArgsConfig } from "node:util"
import { stringToLevelMap } from "../../server/log.ts"

const getArgOptions = () =>
  ({
    help: {
      type: "boolean",
      short: "h",
      description: "Show this help message"
    },
    version: {
      type: "boolean",
      short: "v",
      description: "Show version information"
    },
    log: {
      type: "string",
      short: "l",
      default: process.env.LOG_LEVEL || undefined,
      description: `Set the log level. Allowed values: ${Object.keys(stringToLevelMap)
        .map((c) => c.toLocaleLowerCase())
        .join(", ")}`
    },
    headless: {
      type: "boolean",
      short: "H",
      description: "Don't open the browser automatically"
    }
  }) as const satisfies ParseArgsConfig["options"] & Record<string, { description: string }>

export function parseArgsWithDefaults(rawArgs?: string[]) {
  const args = parseArgs({
    args: rawArgs,
    strict: true,
    allowPositionals: true,
    allowNegative: true,
    options: getArgOptions()
  })

  return { ...args.values, path: args.positionals.length === 0 ? process.cwd() : args.positionals[0] }
}

export const getUsageText = () => {
  const args = Object.entries(getArgOptions()).map(([name, opts]) => [
    `  ${"short" in opts ? `-${opts.short}, ` : ``}--${name}`,
    `${opts.description}`
  ])

  const longestArgLength = Object.entries(getArgOptions()).reduce((max, [name, opts]) => {
    const argLength = `  ${"short" in opts ? `-${opts.short}, ` : ``}--${name}`.length
    return Math.max(max, argLength)
  }, 0)

  const argsString = args.map(([arg, desc]) => `${arg.padEnd(longestArgLength)}  ${desc}`).join("\n")

  return `Usage: git truck [OPTION]... [PATH]...

  Visualize git repositories as interactive graphs.

With no PATH specified, opens or lists current working directory

${argsString}

Examples:
  git truck                   Visualize git repository or list git repositories in current directory
  git truck <path>            Visualize git repository or list git repositories in <path>
  git truck --headless        Start the application without opening the browser
  git truck --log debug       Start the application with debug log level

Documentation can be found at https://github.com/git-truck/git-truck
`
}
