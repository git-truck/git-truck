import "dotenv/config"
import { parse } from "./parse.server"

const args = process.argv.slice(2)
parse(args)
