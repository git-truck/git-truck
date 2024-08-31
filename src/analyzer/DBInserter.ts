import type { Database } from "duckdb-async"
import { promises as fs } from "fs"
import { tableToIPC, tableFromJSON } from "apache-arrow"

const bundleSize = 5000

export abstract class Inserter<T> {
  protected rows: T[] = []
  public addRow(row: T) {
    this.rows.push(row)
  }

  public async addAndFinalize(rows: T[]) {
    this.rows = rows
    await this.finalize()
  }

  public abstract finalize(): Promise<void>

  constructor(
    protected table: string,
    protected tempPath: string,
    protected db: Database,
    protected id: string
  ) {}

  public static getInserterType() {
    switch (process.platform) {
      case "darwin":
      case "linux":
        return "ARROW"
      default:
        return "JSON"
    }
  }

  public static getSystemSpecificInserter<T>(table: string, tempPath: string, db: Database, id?: string): Inserter<T> {
    switch (process.platform) {
      case "darwin":
      case "linux":
        return new ArrowInserter<T>(table, tempPath, db, id ?? "")
      default:
        return new JsonInserter<T>(table, tempPath, db, id ?? "")
    }
  }
}

class JsonInserter<T> extends Inserter<T> {
  private tempFile: string
  constructor(table: string, tempPath: string, db: Database, id: string) {
    super(table, tempPath, db, id)
    this.tempFile = tempPath + table + id + ".json"
  }

  public async finalize() {
    if (this.rows.length < 1) return
    for (let i = 0; i < this.rows.length; i += bundleSize) {
      const sliced = this.rows.slice(i, i + bundleSize)
      const stringified = JSON.stringify(sliced, (key, value) => {
        if (typeof value === "undefined") return null
        return value
      })
      await fs.writeFile(this.tempFile, stringified)
      await this.db.exec(`INSERT INTO ${this.table} SELECT * FROM '${this.tempFile}'`)
      await fs.rm(this.tempFile)
    }

    this.rows = []
  }
}

class ArrowInserter<T> extends Inserter<T> {
  public async finalize() {
    if (this.rows.length < 1) return
    for (let i = 0; i < this.rows.length; i += bundleSize) {
      const sliced = this.rows.slice(i, i + bundleSize)
      const arrowTable = tableFromJSON(sliced as Record<string, unknown>[])
      const tempTableName = `temp_${this.table}_${this.id}`
      try {
        await this.db.register_buffer(tempTableName, [tableToIPC(arrowTable)], true)
        await this.db.exec(`INSERT INTO ${this.table} BY NAME (SELECT * FROM ${tempTableName});`)
        await this.db.unregister_buffer(tempTableName)
      } catch (e) {
        console.warn("Arrow inserter failed, falling back to JSON inserter", e)
        await this.db.unregister_buffer(tempTableName)
        const jsonInserter = new JsonInserter(this.table, this.tempPath, this.db, this.id)
        await jsonInserter.addAndFinalize(this.rows)
      }
    }
  }
}
