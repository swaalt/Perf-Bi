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

  let client: DbClient
  switch (ds.type) {
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

const DANGEROUS_RE = /^\s*(DROP|TRUNCATE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+\w|CREATE\s+(OR\s+REPLACE\s+)?TABLE|ALTER\s+TABLE|GRANT|REVOKE)/i

export function isSafeQuery(sql: string): { safe: boolean; reason?: string } {
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    if (DANGEROUS_RE.test(stmt)) {
      return { safe: false, reason: `Statement potencialmente destructivo: "${stmt.slice(0, 60)}..."` }
    }
  }
  return { safe: true }
}
