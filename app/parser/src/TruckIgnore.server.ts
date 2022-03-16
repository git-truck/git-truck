import { readFileSync } from "fs"
import { compile } from "gitignore-parser"
import { log } from "./log.server"

export default class TruckIgnore {
  private truckignore
  constructor(path: string) {
    try {
      const file = readFileSync(path + "/.truckignore", "utf-8")
      this.truckignore = compile(file)
    } catch (e) {
      log.warn("No .truckignore found")
    }
  }

  public isAccepted(fileName: string) {
    if (!this.truckignore) return true
    return this.truckignore.accepts(fileName)
  }
}
