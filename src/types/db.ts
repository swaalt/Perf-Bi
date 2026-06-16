export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  durationMs: number
}

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
}

export interface SchemaTable {
  name: string
  schema?: string
  columns: SchemaColumn[]
  rowCount?: number
}

export interface DbSchema {
  tables: SchemaTable[]
}

export interface DbClient {
  query(sql: string): Promise<QueryResult>
  getSchema(): Promise<DbSchema>
  testConnection(): Promise<void>
  close(): Promise<void>
}

export type DataSourceType =
  | "POSTGRESQL" | "MYSQL" | "MARIADB" | "SQLITE" | "MSSQL" | "CLICKHOUSE" | "REDSHIFT"
  | "BIGQUERY" | "SNOWFLAKE"
  | "REST_API" | "GOOGLE_SHEETS" | "AIRTABLE" | "NOTION" | "JIRA" | "HUBSPOT"

export const HTTP_SOURCE_TYPES = new Set<string>([
  "REST_API", "GOOGLE_SHEETS", "AIRTABLE", "NOTION", "JIRA", "HUBSPOT", "CLICKHOUSE",
])

export interface DataSourceConfig {
  id: string
  name: string
  type: string
  host?: string | null
  port?: number | null
  database?: string | null
  username?: string | null
  password?: string | null
  filename?: string | null
  apiUrl?: string | null
  metadata?: string | null
}
