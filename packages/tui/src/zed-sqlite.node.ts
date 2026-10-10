import { DatabaseSync } from "node:sqlite"

export class Database {
  private readonly native: DatabaseSync

  constructor(filename: string, options: { readonly: boolean }) {
    this.native = new DatabaseSync(filename, { readOnly: options.readonly })
  }

  query(sql: string) {
    const statement = this.native.prepare(sql)
    return {
      all: (params?: Record<string, number>) => statement.all(params ?? {}),
      get: (params?: Record<string, number>) => statement.get(params ?? {}),
    }
  }

  close() {
    this.native.close()
  }
}
