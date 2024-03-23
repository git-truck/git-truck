import type { Database } from "duckdb-async"
import { promises as fs } from "fs"

const bundleSize = 5000

export interface Inserter<T> {
  insert: (rows: T[]) => Promise<void>
  addRows: (rows: T[]) => Promise<void>
  addRow: (row: T) => Promise<void>
  finalize: () => Promise<void>
  
}

export class JsonInserter<T> implements Inserter<T> {
  private rows: T[] = []
  private tempFile: string
  constructor(private table: string, tempPath: string, private db: Database) {
    this.tempFile = tempPath + table + ".json"
  }

  public async addRow(row: T) {
    this.rows.push(row)
    if (this.rows.length >= bundleSize) await this.finalize()
  }

  public async addRows(rows: T[]) {
    this.rows.push(...rows)
    if (this.rows.length >= bundleSize) await this.finalize()
  }

  public async finalize() {
    if (this.rows.length < 1) return
    for (let i = 0; i < this.rows.length; i += bundleSize) {
      const sliced = this.rows.slice(i, i + bundleSize)
      await fs.writeFile(this.tempFile, JSON.stringify(sliced))
      await this.db.exec(`INSERT INTO ${this.table} SELECT * FROM '${this.tempFile}'`)
      await fs.rm(this.tempFile)
    }
    this.rows = []
  }

  public async insert(rows: T[]) {
    await fs.writeFile(this.tempFile, JSON.stringify(rows))
    await this.db.exec(`INSERT INTO ${this.table} SELECT * FROM '${this.tempFile}'`)
    await fs.rm(this.tempFile)
  }
}

// export class ArrowInserter<T extends Record<string, unknown>> implements Inserter<T> {
//   constructor(private table: string, private db: Database) {}

//   public async insert(rows: T[]) {
//     const arrowTable = tableFromJSON(rows)
//     await this.db.register_buffer("temp_commits", [tableToIPC(arrowTable)], true)
//     await this.db.exec(`INSERT INTO ${this.table} SELECT * FROM temp_commits;`)
//     await this.db.unregister_buffer("temp_commits")
//   }
// }

export class DBInserter<T> {
  private queryBuilder: string[]
  private values: T[] = []
  private insertQuery: string
  private rowTemplate: string

  constructor(
    table: string,
    columns: string[],
    private db: Promise<Database>
  ) {
    this.insertQuery = `INSERT INTO ${table} (${columns.join(",")}) VALUES `
    this.queryBuilder = [this.insertQuery]
    this.rowTemplate = `(${columns.map(() => "?").join()}),`
  }

  public async addRow(...toAdd: T[]) {
    this.queryBuilder.push(this.rowTemplate)
    for (const add of toAdd) {
      this.values.push(add)
    }
    if (this.queryBuilder.length > bundleSize) await this.finalize()
  }

  public async finalize() {
    if (this.values.length === 0) return
    const insertStatement = await (await this.db).prepare(this.queryBuilder.join(""))
    await insertStatement.run(...this.values)
    await insertStatement.finalize()
    this.queryBuilder = [this.insertQuery]
    this.values = []
  }
}
