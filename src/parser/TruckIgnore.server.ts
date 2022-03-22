import { readFileSync, openSync, writeSync, close } from "fs"
import { compile } from "gitignore-parser"
import { parseArgs } from "./args.server"
import { log } from "./log.server"
import { getRepoDir } from "./parse.server"
import { join } from "path"

export default class TruckIgnore {
  private truckignore
  private truckIgnorePath
  constructor(path?: string) {
    const thePath = path ?? getRepoDir(parseArgs())
    if (!thePath) {
      throw Error("No path provided")
    }
    this.truckIgnorePath = join(thePath, ".truckignore")
    try {
      const file = readFileSync(this.truckIgnorePath, "utf-8")
      this.truckignore = compile(file)
    } catch (e) {
      log.warn("No .truckignore found")
    }
  }

  public isAccepted(fileName: string) {
    if (!this.truckignore) return true
    return this.truckignore.accepts(fileName)
  }

  public addIgnoreEntry(line: string) {
    const data = readFileSync(this.truckIgnorePath)
    const fd = openSync(this.truckIgnorePath, "w+")
    const insert = Buffer.from(line.trim() + "\n")
    writeSync(fd, insert, 0, insert.length, 0)
    writeSync(fd, data, 0, data.length, insert.length)
    close(fd, (err) => {
      if (err) throw err
    })
  }
}
