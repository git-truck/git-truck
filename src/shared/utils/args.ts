import { parseArgs, type ParseArgsConfig } from "node:util"
import { stringToLevelMap } from "~/server/log"

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
      description: `Set the log level: ${Object.keys(stringToLevelMap)
        .map((c) => c.toLocaleLowerCase())
        .join(", ")}`
    },
    headless: {
      type: "boolean",
      short: "H",
      description: "Start without opening the browser automatically"
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
    `  ${"short" in opts ? `-${opts.short}, ` : ``}--${name}${name === "log" ? " <level>" : ""}`,
    `${opts.description}`
  ])

  const longestArgLength = Object.entries(getArgOptions()).reduce((max, [name, opts]) => {
    const argLength = `  ${"short" in opts ? `-${opts.short}, ` : ``}--${name}${name === "log" ? " <level>" : ""}`.length
    return Math.max(max, argLength)
  }, 0)

  const argsString = args.map(([arg, desc]) => `${arg.padEnd(longestArgLength)}  ${desc}`).join("\n")

  return `Usage: git truck [options] [path]

Open a local visualization workspace for Git repositories.

If no path is provided, Git Truck uses the current working directory.
If the path is a Git repository, Git Truck opens it directly.
If the path contains multiple repositories, Git Truck opens a repository browser.

Options:
${argsString}

Examples:
  git truck              Open the current repository or repository browser
  git truck <path>       Open a repository or folder of repositories
  git truck --headless   Start and print the URL without opening a browser
  git truck --log debug  Show debug logs

Documentation: https://github.com/git-truck/git-truck
`
}
