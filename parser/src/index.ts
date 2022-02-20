import "dotenv/config"
import { parse } from "./parse.js"

const args = process.argv.slice(2)
await parse(args)
