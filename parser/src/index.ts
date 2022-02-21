import "dotenv/config"
import { parse } from "./parse"

const args = process.argv.slice(2)
parse(args)
