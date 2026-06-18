import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDbClient, isSafeQuery } from "@/lib/db"
import { executeHttpSource } from "@/lib/db/http-sources"
import { HTTP_SOURCE_TYPES, type DataSourceConfig } from "@/types/db"
import { z } from "zod"
import Database from "better-sqlite3"

const schema = z.object({
  sql: z.string().min(1).max(100000),
  dataSourceId: z.string().min(1),
})

// Run SQL against a saved dataset using in-memory SQLite
async function queryDataset(datasetId: string, sql: string) {
  const ds = await prisma.savedDataset.findUnique({ where: { id: datasetId } })
  if (!ds) throw new Error("Dataset no encontrado")

  const columns = JSON.parse(ds.columns) as string[]
  const rows    = JSON.parse(ds.rows) as unknown[][]

  // Build in-memory SQLite, load data, run query
  const db = new Database(":memory:")
  const safeCols = columns.map(c => `"${c.replace(/"/g, '""')}"`)
  db.exec(`CREATE TABLE dataset (${safeCols.map(c => `${c} TEXT`).join(", ")})`)

  const insert = db.prepare(`INSERT INTO dataset VALUES (${columns.map(() => "?").join(", ")})`)
  const insertMany = db.transaction((rowArr: unknown[][]) => {
    for (const row of rowArr) insert.run(...(row as string[]))
  })
  insertMany(rows)

  // Replace "FROM dataset_name" or bare "SELECT" with "FROM dataset"
  // Users write SQL like: SELECT col FROM data — we map to "dataset" table
  let execSql = sql.trim()
  // If sql has no FROM clause and is just column refs, wrap it
  if (!/FROM\s/i.test(execSql)) {
    execSql = `SELECT ${execSql} FROM dataset`
  }

  const stmt = db.prepare(execSql)
  const resultRows = stmt.all() as Record<string, unknown>[]
  db.close()

  if (!resultRows.length) return { columns, rows: [] }
  const outCols = Object.keys(resultRows[0])
  return {
    columns: outCols,
    rows: resultRows.map(r => outCols.map(c => r[c])),
  }
}

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const { sql, dataSourceId } = body.data

  const check = isSafeQuery(sql)
  if (!check.safe) {
    return NextResponse.json({ error: `Query bloqueado: ${check.reason}` }, { status: 400 })
  }

  // ── Saved dataset path ──
  if (dataSourceId.startsWith("dataset:")) {
    const dsId = dataSourceId.slice(8)
    try {
      const result = await queryDataset(dsId, sql)
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 400 })
    }
  }

  const ds = await prisma.dataSource.findUnique({ where: { id: dataSourceId } })
  if (!ds) return NextResponse.json({ error: "Fuente de datos no encontrada" }, { status: 404 })

  try {
    if (HTTP_SOURCE_TYPES.has(ds.type)) {
      const result = await executeHttpSource(ds as unknown as DataSourceConfig, sql)
      return NextResponse.json(result)
    }

    const client = await getDbClient(dataSourceId)
    const result = await client.query(sql)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
