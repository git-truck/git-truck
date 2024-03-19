import type { Database } from "duckdb-async"

const bundleSize = 5000

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
