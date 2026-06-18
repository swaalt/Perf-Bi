import mysql from "mysql2/promise";
import type { DbClient, DbSchema, QueryResult, DataSourceConfig } from "@/types/db";

export class MySqlClient implements DbClient {
  private conn: mysql.Connection | null = null;

  constructor(private config: DataSourceConfig) {}

  private async getConn(): Promise<mysql.Connection> {
    if (!this.conn) {
      this.conn = await mysql.createConnection({
        host: this.config.host ?? "localhost",
        port: this.config.port ?? 3306,
        database: this.config.database ?? undefined,
        user: this.config.username ?? undefined,
        password: this.config.password ?? undefined,
        connectTimeout: 10000,
      });
    }
    return this.conn;
  }

  async testConnection(): Promise<void> {
    const conn = await this.getConn();
    await conn.query("SELECT 1");
  }

  async query(sql: string): Promise<QueryResult> {
    const conn = await this.getConn();
    const start = Date.now();
    const [rows, fields] = await conn.query(sql);
    const rowsArr = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
    const columns = (fields ?? []).map((f) => f.name);
    return {
      columns,
      rows: rowsArr.map((row) => columns.map((c) => row[c])),
      rowCount: rowsArr.length,
      durationMs: Date.now() - start,
    };
  }

  async getSchema(): Promise<DbSchema> {
    const conn = await this.getConn();
    const dbName = this.config.database;
    const [tablesRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [dbName]
    );

    const tables: DbSchema["tables"] = []
    for (const t of tablesRows) {
      const [cols] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [dbName, t.TABLE_NAME]
      );
      const [countRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT TABLE_ROWS FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [dbName, t.TABLE_NAME]
      );
      tables.push({
        name: t.TABLE_NAME as string,
        columns: cols.map((c) => ({
          name: c.COLUMN_NAME as string,
          type: c.DATA_TYPE as string,
          nullable: c.IS_NULLABLE === "YES",
        })),
        rowCount: Number(countRows[0]?.TABLE_ROWS ?? 0),
      });
    }

    return { tables };
  }

  async close(): Promise<void> {
    await this.conn?.end();
    this.conn = null;
  }
}
