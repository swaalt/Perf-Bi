import Database from "better-sqlite3";
import type { DbClient, DbSchema, QueryResult, DataSourceConfig } from "@/types/db";

export class SqliteClient implements DbClient {
  private db: Database.Database;

  constructor(private config: DataSourceConfig) {
    const filepath = config.filename ?? ":memory:";
    this.db = new Database(filepath, { readonly: false, fileMustExist: false });
  }

  async testConnection(): Promise<void> {
    this.db.prepare("SELECT 1").get();
  }

  async query(sql: string): Promise<QueryResult> {
    const start = Date.now();
    try {
      const stmt = this.db.prepare(sql);
      // SELECT returns rows, others return RunResult
      if (stmt.reader) {
        const rawRows = stmt.all() as Record<string, unknown>[];
        const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : []
        return {
          columns,
          rows: rawRows.map((row) => columns.map((c) => row[c])),
          rowCount: rawRows.length,
          durationMs: Date.now() - start,
        }
      } else {
        const result = stmt.run();
        return {
          columns: ["changes"],
          rows: [[result.changes]],
          rowCount: result.changes,
          durationMs: Date.now() - start,
        };
      }
    } catch (err) {
      throw new Error(String(err));
    }
  }

  async getSchema(): Promise<DbSchema> {
    const tables = this.db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      )
      .all() as { name: string }[];

    return {
      tables: tables.map((t) => {
        const cols = this.db.prepare(`PRAGMA table_info(${t.name})`).all() as {
          name: string;
          type: string;
          notnull: number;
        }[];
        const countRow = this.db
          .prepare(`SELECT COUNT(*) as c FROM "${t.name}"`)
          .get() as { c: number };
        return {
          name: t.name,
          columns: cols.map((c) => ({
            name: c.name,
            type: c.type || "TEXT",
            nullable: c.notnull === 0,
          })),
          rowCount: countRow.c,
        };
      }),
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
