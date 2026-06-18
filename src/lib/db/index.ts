import { prisma } from "@/lib/prisma"
import { PostgresClient } from "./postgres"
import { MySqlClient } from "./mysql"
import { SqliteClient } from "./sqlite"
import type { DbClient, DataSourceConfig } from "@/types/db"
import { HTTP_SOURCE_TYPES } from "@/types/db"

const clientCache = new Map<string, DbClient>()

export async function getDbClient(dataSourceId: string): Promise<DbClient> {
  if (clientCache.has(dataSourceId)) return clientCache.get(dataSourceId)!

  const ds = await prisma.dataSource.findUniqueOrThrow({ where: { id: dataSourceId } })
  const config = ds as unknown as DataSourceConfig

  if (HTTP_SOURCE_TYPES.has(ds.type)) {
    throw new Error("HTTP_SOURCE — use executeHttpSource() instead")
  }

  const type = ds.type.toUpperCase()
  let client: DbClient
  switch (type) {
    case "POSTGRESQL":
    case "REDSHIFT":
      client = new PostgresClient(config); break
    case "MYSQL":
    case "MARIADB":
      client = new MySqlClient(config); break
    case "SQLITE":
      client = new SqliteClient(config); break
    default:
      throw new Error(`Tipo de fuente no soportado: ${ds.type}`)
  }

  clientCache.set(dataSourceId, client)
  return client
}

export function invalidateClient(dataSourceId: string) {
  const client = clientCache.get(dataSourceId)
  if (client) {
    client.close().catch(() => {})
    clientCache.delete(dataSourceId)
  }
}

const WRITE_RE = /^\s*(DROP|TRUNCATE|DELETE\s+FROM|INSERT\s+(INTO|IGNORE|INTO\s+IGNORE)|UPDATE\s+\w|REPLACE\s+(INTO\s+)?|MERGE\s+(INTO\s+)?|CALL\s+|EXEC\w*\s+|LOAD\s+(DATA|FILE)|SELECT\s+.*\s+INTO\s+(OUTFILE|DUMPFILE)|RENAME\s+(TABLE|DATABASE|SCHEMA)|ALTER\s+|CREATE\s+(OR\s+REPLACE\s+)?(TABLE|DATABASE|SCHEMA|INDEX|VIEW|TRIGGER|FUNCTION|PROCEDURE|EVENT|TEMPORARY|UNIQUE)|LOCK\s+(TABLES|TABLE)|UNLOCK\s+(TABLES|TABLE)|GRANT\s+|REVOKE\s+|SET\s+|KILL\s+|SHUTDOWN|FLUSH\s+|RESET\s+|PURGE\s+|CHANGE\s+|OPTIMIZE\s+|REPAIR\s+|ANALYZE\s+|CHECK\s+|CACHE\s+|IMPORT\s+|EXPORT\s+|BACKUP\s+|RESTORE\s+)/i

export function isSafeQuery(sql: string): { safe: boolean; reason?: string } {
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    if (WRITE_RE.test(stmt)) {
      return { safe: false, reason: `Operación de escritura bloqueada: "${stmt.slice(0, 80)}..."` }
    }
  }
  return { safe: true }
}
