import yargsParser from "yargs-parser"
import { setLogLevel } from "./log.server"
import { isAbsolute, resolve } from "path"

export function handleArgs(rawArgs: string[]) {
    const args = yargsParser(rawArgs, {
        configuration: {
          "duplicate-arguments-array": false,
        },
      })
  
      if (args.log) {
        setLogLevel(args.log)
      }
  
      if (args.help || args.h) {
        console.log(`Git Visual
  
      Usage: ./start.sh <args> or ./dev.sh <args>
  
      Options:
        --path <path to git repository> (default: current directory)
        --branch <branch name> (default: checked out branch)
        --out <output path for json file> (default: ./app/build/data.json)
        --help, -h: Show this help message`)
        process.exit(1)
      }
  
      const cwd = process.cwd()
  
      let repoDir = args.path ?? "."
      if (!isAbsolute(repoDir))
        repoDir = resolve(cwd, repoDir)
  
      const branch = args.branch ?? null
  
      return [cwd, repoDir, branch, args.out]
}