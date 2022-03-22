import yargsParser from "yargs-parser"

export function parseArgs(rawArgs: string[] = process.argv.slice(2)) {
  return yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false,
    },
  })
}
