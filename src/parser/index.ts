import "dotenv/config"
import { handleArgs } from "./args-handler.server"
import { Parser } from "./Parser.server"

const args = process.argv.slice(2)
const [cwd, repoDir, branch, out] = handleArgs(args)
new Parser(cwd, repoDir, branch, out).parse()
