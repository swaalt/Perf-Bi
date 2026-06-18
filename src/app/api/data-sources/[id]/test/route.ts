import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PostgresClient } from "@/lib/db/postgres"
import { MySqlClient } from "@/lib/db/mysql"
import { SqliteClient } from "@/lib/db/sqlite"
import { testHttpSource } from "@/lib/db/http-sources"
import { HTTP_SOURCE_TYPES, type DataSourceConfig } from "@/types/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ds = await prisma.dataSource.findUnique({ where: { id } })
  if (!ds) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const config = ds as unknown as DataSourceConfig

  try {
    const type = ds.type.toUpperCase()
    if (HTTP_SOURCE_TYPES.has(type)) {
      await testHttpSource(config)
      return NextResponse.json({ ok: true })
    }

    let client
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
        return NextResponse.json({ error: `Tipo no soportado para test: "${ds.type}"` }, { status: 400 })
    }

    await client.testConnection()
    await client.close()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 })
  }
}
