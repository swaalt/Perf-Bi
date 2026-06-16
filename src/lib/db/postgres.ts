import { Client } from "pg";
import type { DbClient, DbSchema, QueryResult, DataSourceConfig } from "@/types/db";

export class PostgresClient implements DbClient {
  private client: Client;

  constructor(private config: DataSourceConfig) {
    this.client = new Client({
      host: config.host ?? "localhost",
      port: config.port ?? 5432,
      database: config.database ?? undefined,
      user: config.username ?? undefined,
      password: config.password ?? undefined,
      connectionTimeoutMillis: 10000,
    });
  }

  async testConnection(): Promise<void> {
    await this.client.connect();
    await this.client.query("SELECT 1");
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.client) throw new Error("Not connected");
    const start = Date.now();
    await this.client.connect().catch(() => {});
    const result = await this.client.query(sql);
    const columns = result.fields.map((f) => f.name);
    return {
      columns,
      rows: result.rows.map((row) => columns.map((c) => row[c])),
      rowCount: result.rowCount ?? result.rows.length,
      durationMs: Date.now() - start,
    };
  }

  async getSchema(): Promise<DbSchema> {
    const tablesRes = await this.client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    const tables = await Promise.all(
      tablesRes.rows.map(async (t) => {
        const colRes = await this.client.query(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [t.table_schema, t.table_name]
        );
        const countRes = await this.client.query(
          `SELECT reltuples::bigint AS estimate FROM pg_class
           JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
           WHERE relname = $1 AND nspname = $2`,
          [t.table_name, t.table_schema]
        );
        return {
          name: t.table_name as string,
          schema: t.table_schema as string,
          columns: colRes.rows.map((c) => ({
            name: c.column_name as string,
            type: c.data_type as string,
            nullable: c.is_nullable === "YES",
          })),
          rowCount: Number(countRes.rows[0]?.estimate ?? 0),
        };
      })
    );

    return { tables };
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
