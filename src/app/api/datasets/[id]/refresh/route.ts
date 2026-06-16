import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbClient, isSafeQuery } from "@/lib/db"
import { executeHttpSource } from "@/lib/db/http-sources"
import { HTTP_SOURCE_TYPES, type DataSourceConfig } from "@/types/db"

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ds = await prisma.savedDataset.findUnique({ where: { id } })
  if (!ds) return NextResponse.json({ error: "Dataset no encontrado" }, { status: 404 })
  if (!ds.sourceId || !ds.sourceQuery) {
    return NextResponse.json({ error: "Sin fuente original para refrescar" }, { status: 400 })
  }

  const source = await prisma.dataSource.findUnique({ where: { id: ds.sourceId } })
  if (!source) return NextResponse.json({ error: "Fuente original eliminada" }, { status: 404 })

  try {
    let result: { columns: string[]; rows: unknown[][] }
    if (HTTP_SOURCE_TYPES.has(source.type)) {
      result = await executeHttpSource(source as unknown as DataSourceConfig, ds.sourceQuery)
    } else {
      const check = isSafeQuery(ds.sourceQuery)
      if (!check.safe) return NextResponse.json({ error: `Query bloqueado: ${check.reason}` }, { status: 400 })
      const client = await getDbClient(source.id)
      result = await client.query(ds.sourceQuery)
    }

    const updated = await prisma.savedDataset.update({
      where: { id },
      data: {
        columns:  JSON.stringify(result.columns),
        rows:     JSON.stringify(result.rows),
        rowCount: result.rows.length,
      },
    })
    return NextResponse.json({ ...updated, columns: result.columns, rowCount: result.rows.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
